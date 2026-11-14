// 面板数据的宿主侧逻辑：缓存、刷新、路由。
// 浏览器抓取放在 scrape.mjs 里，由本文件 spawn 成独立进程执行，
// 避免把 Playwright 塞进 Electron 主进程。
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	CACHE_FILE,
	COOKIE_DIR,
	HERE,
	SETTINGS_FILE,
	SESSION_FILE,
	SKILL,
	STATE_DIR,
	WORKSPACE
} from "./config.mjs";

const SCRAPE = join(HERE, "scrape.mjs");
const LOGIN = join(HERE, "login-cdp.mjs");

export const SOURCES = ["canvas", "education", "chaoxing", "mooc", "zhihuishu"];

export const NOTE_OVERRIDE = {
	mooc: (n) => `${n} 门 SPOC 课程（MOOC 网页版没有跨课程待办，这里显示课程进度）`,
	zhihuishu: (n) => `${n} 项待完成`
};

// 面板上的开关，落在 settings.json 里，定时任务到点会先读它。
const DEFAULT_SETTINGS = { scheduledDigest: true, scheduledSources: ["canvas", "education"] };

export function readSettings() {
	let raw = null;
	try {
		raw = JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
	} catch {}
	const merged = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
	if (merged.scheduledDigest !== false) merged.scheduledDigest = true;
	if (!Array.isArray(merged.scheduledSources) || !merged.scheduledSources.length) {
		merged.scheduledSources = [...DEFAULT_SETTINGS.scheduledSources];
	}
	merged.scheduledSources = merged.scheduledSources.filter((name) => SOURCES.includes(name));
	if (!merged.scheduledSources.length) merged.scheduledSources = [...DEFAULT_SETTINGS.scheduledSources];
	return merged;
}

export function writeSettings(patch) {
	const next = { ...readSettings() };
	if (patch && typeof patch === "object") {
		if ("scheduledDigest" in patch) next.scheduledDigest = patch.scheduledDigest !== false;
		if (Array.isArray(patch.scheduledSources)) {
			const list = patch.scheduledSources.filter((name) => SOURCES.includes(name));
			if (list.length) next.scheduledSources = list;
		}
	}
	mkdirSync(STATE_DIR, { recursive: true });
	const tmp = `${SETTINGS_FILE}.tmp`;
	writeFileSync(tmp, JSON.stringify(next, null, 2));
	renameSync(tmp, SETTINGS_FILE);
	return next;
}

const SOURCE_META = {
	canvas: { title: "Canvas 作业", hint: "近期截止的作业与提交状态", url: "https://canvas.tongji.edu.cn" },
	education: { title: "1系统公告", hint: "通知、公告与教学安排", url: "https://1.tongji.edu.cn" },
	chaoxing: { title: "学习通待办", hint: "作业、考试与任务点", url: "https://i.chaoxing.com/base?ws=1" },
	mooc: { title: "MOOC 待办", hint: "测验、作业与讨论", url: "https://www.icourse163.org/home.htm" },
	zhihuishu: { title: "智慧树待办", hint: "学习任务与见面课", url: "https://hike-teaching-center.polymas.com/stu-hike/agent-course-hike/ai-course-center" }
};

function emptyCache() {
	return { updatedAt: {}, sources: {} };
}

function readSession() {
	try {
		return JSON.parse(readFileSync(SESSION_FILE, "utf8"));
	} catch {
		return null;
	}
}

export function readCache() {
	try {
		const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
		if (!raw || typeof raw !== "object") return emptyCache();
		return {
			updatedAt: raw.updatedAt && typeof raw.updatedAt === "object" ? raw.updatedAt : {},
			sources: raw.sources && typeof raw.sources === "object" ? raw.sources : {}
		};
	} catch {
		return emptyCache();
	}
}

function writeCache(cache) {
	mkdirSync(STATE_DIR, { recursive: true });
	const tmp = `${CACHE_FILE}.tmp`;
	writeFileSync(tmp, JSON.stringify(cache, null, 2));
	renameSync(tmp, CACHE_FILE);
}

// skill 用 operation.lock 防并发，但进程被 SIGKILL（比如面板超时）时会留下死锁，
// 之后每次调用都报 SESSION_STALE。锁文件里是 pid，pid 不在了就说明是残留，直接删。
function clearStaleLock() {
	const lock = join(STATE_DIR, "operation.lock");
	let pid = 0;
	try {
		pid = Number(readFileSync(lock, "utf8").trim());
	} catch {
		return;
	}
	if (!Number.isInteger(pid) || pid <= 0) {
		try {
			rmSync(lock, { force: true });
		} catch {}
		return;
	}
	try {
		process.kill(pid, 0);
		return; // 进程还活着，锁是真的，别动
	} catch (error) {
		if (error.code !== "ESRCH") return;
	}
	try {
		rmSync(lock, { force: true });
	} catch {}
}

// 超时被 SIGKILL 的子进程会留下它拉起的 Chrome（Playwright 的临时 profile 目录名固定），
// 这些孤儿进程还占着内存，顺手收掉。
function sweepBrowsers() {
	try {
		spawn("pkill", ["-f", "playwright_chromiumdev_profile"], { stdio: "ignore" }).unref();
	} catch {}
}

function run(command, args, { timeout = 180000, env = {} } = {}) {
	clearStaleLock();
	return new Promise((resolve) => {
		const child = spawn(command, args, {
			cwd: WORKSPACE,
			env: {
				...process.env,
				ELECTRON_RUN_AS_NODE: "1",
				TONGJI_ONLINE_HOME: STATE_DIR,
				TONGJI_ONLINE_CHROME_SANDBOX: "0",
				...env
			},
			stdio: ["ignore", "pipe", "pipe"]
		});
		let out = "";
		let err = "";
		let settled = false;
		const finish = (payload) => {
			if (settled) return;
			settled = true;
			resolve(payload);
		};
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			sweepBrowsers();
			// 子进程死了但 Chrome 孙进程还攥着 stdout 管道时 close 不会触发，
			// 再等 5 秒就直接返回，别让一次超时把整轮刷新拖死。
			setTimeout(() => {
				child.stdout?.destroy();
				child.stderr?.destroy();
				finish({ ok: false, code: -2, stdout: out, stderr: `${err}\n（超时 ${Math.round(timeout / 1000)} 秒，已终止）` });
			}, 5000);
		}, timeout);
		child.stdout.on("data", (chunk) => {
			out += chunk;
		});
		child.stderr.on("data", (chunk) => {
			err += chunk;
		});
		child.on("error", (error) => {
			clearTimeout(timer);
			finish({ ok: false, code: -1, stdout: out, stderr: `${err}${error.message}` });
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			finish({ ok: code === 0, code, stdout: out, stderr: err });
		});
	});
}

function parseJson(text) {
	const trimmed = text.trim();
	if (!trimmed) return null;
	try {
		return JSON.parse(trimmed);
	} catch {}
	const start = trimmed.indexOf("{");
	const end = trimmed.lastIndexOf("}");
	if (start >= 0 && end > start) {
		try {
			return JSON.parse(trimmed.slice(start, end + 1));
		} catch {}
	}
	return null;
}

function item({ title, meta, due, url, extra }) {
	return {
		title: String(title ?? "").slice(0, 200),
		meta: String(meta ?? "").slice(0, 120),
		due: due ? String(due).slice(0, 40) : "",
		url: typeof url === "string" && /^https?:\/\//.test(url) ? url : "",
		extra: extra ? String(extra).slice(0, 120) : ""
	};
}

function relativeTime(iso) {
	const at = Date.parse(iso ?? "");
	if (!Number.isFinite(at)) return "";
	const diff = at - Date.now();
	const abs = Math.abs(diff);
	const unit = abs < 3600000 ? ["分钟", 60000] : abs < 86400000 ? ["小时", 3600000] : ["天", 86400000];
	const value = Math.round(abs / unit[1]);
	return `${diff >= 0 ? "还剩" : "已过"}${value}${unit[0]}`;
}

// Canvas 直接读 API，不走技能的 `canvas upcoming`。
// 原因：技能里的 upcoming() 会把 dueAt 为 null 的作业直接丢掉（adapters/canvas.mjs 的
// `if (assignment.dueAt === null) { undatedCount++; continue; }`），还会按 14 天窗口过滤。
// 实测 8 门课 25 项作业里有 7 项没有截止时间（含一项没交的），全被吞掉，界面上只剩 2 项。
const CANVAS_BASE = "https://canvas.tongji.edu.cn";
const CANVAS_KEEP_PAST = 30 * 86_400_000;
const CANVAS_KEEP_FUTURE = 90 * 86_400_000;

function tongjiCookie(state) {
	return (state?.cookies ?? [])
		.filter((row) => /(^|\.)tongji\.edu\.cn$/.test(String(row.domain ?? "").replace(/^\./, "")))
		.map((row) => `${row.name}=${row.value}`)
		.join("; ");
}

function shanghaiIso(value) {
	const at = new Date(value);
	if (!Number.isFinite(at.getTime())) return "";
	const parts = new Intl.DateTimeFormat("sv-SE", {
		timeZone: "Asia/Shanghai",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23"
	}).format(at);
	return `${parts.replace(" ", "T")}+08:00`;
}

async function canvasList(path, cookie) {
	const out = [];
	let url = path.startsWith("http") ? path : `${CANVAS_BASE}${path}`;
	for (let page = 0; page < 10 && url; page++) {
		const response = await fetch(url, {
			headers: { accept: "application/json", cookie, "user-agent": "Mozilla/5.0" },
			redirect: "manual",
			signal: AbortSignal.timeout(20000)
		});
		// Canvas 未登录会 302 到统一认证，别跟着跳。
		if (response.status === 401 || (response.status >= 300 && response.status < 400)) {
			throw Object.assign(new Error("Canvas 登录已失效，先在侧栏点一次 Canvas 刷新重新登录"), {
				code: "LOGIN_REQUIRED"
			});
		}
		if (!response.ok) throw new Error(`Canvas 返回 ${response.status}`);
		const text = (await response.text()).replace(/^while\(1\);\s*/, "");
		let rows;
		try {
			rows = JSON.parse(text);
		} catch {
			throw new Error("Canvas 返回的不是 JSON");
		}
		if (Array.isArray(rows)) out.push(...rows);
		const link = response.headers.get("link") ?? "";
		const next = link.match(/<([^>]+)>\s*;\s*rel="next"/);
		url = next ? next[1] : null;
	}
	return out;
}

async function fetchCanvas() {
	const cookie = tongjiCookie(readSession());
	if (!cookie) {
		throw Object.assign(new Error("Canvas 没有登录态，先跑一次 Canvas 查询"), { code: "LOGIN_REQUIRED" });
	}
	const courses = await canvasList(
		"/api/v1/courses?enrollment_state=active&enrollment_type=student&per_page=100",
		cookie
	);
	const now = Date.now();
	const items = [];
	let scannedCourses = 0;
	let scannedAssignments = 0;
	for (const course of courses) {
		const courseName = String(course?.name ?? "").trim();
		if (!course?.id || !courseName) continue;
		scannedCourses++;
		const rows = await canvasList(
			`/api/v1/courses/${course.id}/assignments?per_page=100&include[]=submission&override_assignment_dates=true`,
			cookie
		);
		for (const row of rows) {
			const title = String(row?.name ?? "").trim();
			if (!title) continue;
			scannedAssignments++;
			const state = row?.submission?.workflow_state;
			const submitted =
				state === "unsubmitted" ? false : ["submitted", "pending_review", "graded"].includes(state) ? true : null;
			const raw = typeof row.due_at === "string" ? row.due_at : "";
			const at = raw ? Date.parse(raw) : Number.NaN;
			const due = Number.isFinite(at) ? raw : "";
			// 收哪些：
			//   未提交的 → 一律收（无截止的也算待办，哪怕早就过期）
			//   已提交的 → 只收截止时间在 [-30 天, +90 天] 内的，避免一堆陈年旧作业
			//   无截止且已提交 → 丢弃，没有信息量
			if (submitted !== false) {
				if (!due) continue;
				if (at < now - CANVAS_KEEP_PAST || at > now + CANVAS_KEEP_FUTURE) continue;
			}
			items.push(
				item({
					title,
					meta: courseName,
					due: due ? shanghaiIso(due) : "",
					url: `${CANVAS_BASE}/courses/${course.id}/assignments/${row.id}`,
					extra: [submitted === false ? "待提交" : submitted === true ? "已提交" : "", due ? relativeTime(due) : "无截止时间"]
						.filter(Boolean)
						.join(" · ")
				})
			);
		}
	}
	// 未提交的排前面；同样是未提交，有截止的按时间从近到远，无截止的垫在它们后面。
	const rank = (row) => {
		if (row.extra.startsWith("待提交")) return row.due ? 0 : 1;
		return 2;
	};
	items.sort(
		(a, b) =>
			rank(a) - rank(b) ||
			(rank(a) === 2 ? String(b.due).localeCompare(String(a.due)) : String(a.due).localeCompare(String(b.due))) ||
			a.title.localeCompare(b.title, "zh")
	);
	const pending = items.filter((row) => row.extra.startsWith("待提交")).length;
	const undated = items.filter((row) => !row.due).length;
	return {
		items,
		note: `${pending} 项待提交 · 扫描 ${scannedCourses} 门课 ${scannedAssignments} 项作业${undated ? ` · ${undated} 项无截止时间` : ""}`,
		total: items.length
	};
}

// 1系统的 sessionId 只有几个小时有效，过期了就自己跑一次 auth login 再重试。
// 统一认证的 cookie 还在时这一步是无感的（实测 0.4 秒）；cookie 也没了才会真开窗口等扫码。
// 定时任务里没人守着屏幕，所以 2 分钟拿不到就放弃，给上层 3 分钟的超时留出收尾余量。
async function reloginEducation() {
	const result = await run(process.execPath, [SKILL, "auth", "login", "--service", "education"], { timeout: 120000 });
	const payload = parseJson(result.stdout);
	return Boolean(payload?.ok && payload?.data?.authenticated);
}

async function fetchEducation() {
	let state = readSession();
	let token = state?.serviceData?.education?.sessionId;
	if (!token) {
		throw Object.assign(new Error("1系统没有登录态，先在侧栏跑一次「1系统」查询或重新登录"), { code: "LOGIN_REQUIRED" });
	}
	const cookie = (state.cookies ?? [])
		.filter((row) => /(^|\.)tongji\.edu\.cn$/.test(String(row.domain ?? "").replace(/^\./, "")))
		.map((row) => `${row.name}=${row.value}`)
		.join("; ");
	const call = (useToken, useCookie) =>
		fetch("https://1.tongji.edu.cn/api/commonservice/commonMsgPublish/findMyCommonMsgPublish", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json",
				"X-Token": useToken,
				cookie: useCookie
			},
			body: JSON.stringify({ pageNum_: 1, pageSize_: 30 }),
			signal: AbortSignal.timeout(20000)
		});

	let response = await call(token, cookie);
	if (response.status === 401 || response.status === 403) {
		if (!(await reloginEducation())) {
			throw Object.assign(new Error("1系统登录态过期，需要重新登录"), { code: "LOGIN_REQUIRED" });
		}
		state = readSession();
		token = state?.serviceData?.education?.sessionId;
		const freshCookie = (state?.cookies ?? [])
			.filter((row) => /(^|\.)tongji\.edu\.cn$/.test(String(row.domain ?? "").replace(/^\./, "")))
			.map((row) => `${row.name}=${row.value}`)
			.join("; ");
		response = await call(token, freshCookie);
	}
	if (response.status === 401 || response.status === 403) {
		throw Object.assign(new Error("1系统登录态过期，重新登录一次"), { code: "LOGIN_REQUIRED" });
	}
	if (!response.ok) throw new Error(`1系统返回 ${response.status}`);
	const payload = await response.json();
	const rows = Array.isArray(payload?.data?.list) ? payload.data.list : [];
	// API 默认把 topStatus: 1 的置顶公告排在前面，而置顶的偏偏是 2022/2024/2025 的老通知，
	// 打开面板第一眼看到的是几年前的公告。这里一律按 publishTime 降序，最新的在最上面。
	const sorted = [...rows].sort((a, b) => {
		const at = Date.parse(String(a?.publishTime ?? "").replace(" ", "T")) || 0;
		const bt = Date.parse(String(b?.publishTime ?? "").replace(" ", "T")) || 0;
		return bt - at;
	});
	const items = sorted.map((row) =>
		item({
			title: row.title,
			meta: [row.faceUserName, row.createUser].filter(Boolean).join(" · "),
			due: row.publishTime,
			url: `https://1.tongji.edu.cn/messageCenter?id=${row.id}`,
			extra: row.topStatus === 1 || row.topStatus === "1" ? "置顶" : ""
		})
	);
	return {
		items,
		note: `共 ${payload?.data?.total_ ?? items.length} 条通知 · 按发布时间倒序`,
		total: items.length
	};
}

function openLoginWindow(source) {
	try {
		rmSync(join(COOKIE_DIR, `${source}.json`), { force: true });
	} catch {}
	// 用 login-cdp.mjs：它拉起的是普通 Chrome 窗口，能被看见、能切到前台。
	spawn(process.execPath, [LOGIN, source], {
		cwd: WORKSPACE,
		detached: true,
		stdio: "ignore",
		env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", TONGJI_ONLINE_HOME: STATE_DIR, TONGJI_ONLINE_CHROME_SANDBOX: "0" }
	}).unref();
}

async function fetchBrowser(source) {
	// 没有登录态时先开一个可见窗口让用户登录，本次直接返回提示，不阻塞面板。
	if (!existsSync(join(COOKIE_DIR, `${source}.json`))) {
		// 用 login-cdp.mjs：它拉起的是普通 Chrome 窗口，能被看见、能切到前台。
		spawn(process.execPath, [LOGIN, source], {
			cwd: WORKSPACE,
			detached: true,
			stdio: "ignore",
			env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", TONGJI_ONLINE_HOME: STATE_DIR, TONGJI_ONLINE_CHROME_SANDBOX: "0" }
		}).unref();
		throw Object.assign(new Error("已打开登录窗口，登录完成后回来再点一次刷新"), { code: "LOGIN_REQUIRED" });
	}
	const result = await run(process.execPath, [SCRAPE, source], { timeout: 120000 });
	const payload = parseJson(result.stdout);
	if (!result.ok || !payload?.ok) {
		if (payload?.code === "LOGIN_REQUIRED") {
			openLoginWindow(source);
			throw Object.assign(new Error("登录已失效，已重新打开登录窗口，登录后再点刷新"), { code: "LOGIN_REQUIRED" });
		}
		if (!payload) {
			const tail = result.stderr.trim().split("\n").filter(Boolean).slice(-2).join(" ");
			throw Object.assign(new Error(tail || `抓取超时（${Math.round(120)} 秒）`), { code: "SCRAPE_FAILED" });
		}
		const message = payload.error || "抓取失败";
		throw Object.assign(new Error(message.slice(0, 300)), { code: payload.code ?? "SCRAPE_FAILED" });
	}
	const items = (payload.items ?? []).map(item);
	return {
		items,
		note: NOTE_OVERRIDE[source]?.(items.length) ?? payload.note ?? "",
		total: items.length
	};
}

const FETCHERS = {
	canvas: fetchCanvas,
	education: fetchEducation,
	chaoxing: () => fetchBrowser("chaoxing"),
	mooc: () => fetchBrowser("mooc"),
	zhihuishu: () => fetchBrowser("zhihuishu")
};

export async function refreshSource(source) {
	if (!SOURCES.includes(source)) {
		throw Object.assign(new Error("未知来源"), { code: "INVALID_ARGUMENT" });
	}
	const cache = readCache();
	try {
		const data = await FETCHERS[source]();
		cache.sources[source] = { ok: true, items: data.items, note: data.note, total: data.total };
		cache.updatedAt[source] = new Date().toISOString();
	} catch (error) {
		cache.sources[source] = {
			ok: false,
			items: cache.sources[source]?.items ?? [],
			error: String(error?.message ?? error).slice(0, 300),
			code: error?.code ?? "UNKNOWN"
		};
		cache.updatedAt[source] = new Date().toISOString();
	}
	writeCache(cache);
	return cache.sources[source];
}

export function snapshot() {
	const cache = readCache();
	return {
		meta: SOURCE_META,
		updatedAt: cache.updatedAt,
		sources: cache.sources,
		settings: readSettings()
	};
}

export function json(response, status, payload) {
	response.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	response.end(JSON.stringify(payload));
}

export function readBody(request, limit = 65536) {
	return new Promise((resolve) => {
		let size = 0;
		let body = "";
		request.on("data", (chunk) => {
			size += chunk.length;
			if (size > limit) {
				request.destroy();
				resolve("");
				return;
			}
			body += chunk;
		});
		request.on("end", () => resolve(body));
		request.on("error", () => resolve(""));
	});
}

export { CACHE_FILE, SETTINGS_FILE, SESSION_FILE, SKILL, STATE_DIR, WORKSPACE };
