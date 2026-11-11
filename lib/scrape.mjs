// 浏览器抓取：学习通 / 中国大学 MOOC / 智慧树。
// 独立进程运行（由 panel.mjs spawn），首次使用会在可见窗口里等用户登录，
// 登录态存成 Playwright storageState，之后静默复用。
//
// 用法：
//   node scrape.mjs <site>          抓取并输出 {ok, items, note}
//   node scrape.mjs <site> --login  只做登录，保存登录态
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHROME, COOKIE_DIR, PLAYWRIGHT } from "./config.mjs";

const SITES = {
	chaoxing: {
		label: "学习通",
		start: "https://i.chaoxing.com/base?ws=1",
		check: async (page) => /(^|\.)chaoxing\.com/.test(new URL(page.url()).hostname) && !/passport|login/i.test(page.url())
	},
	mooc: {
		label: "中国大学 MOOC",
		start: "https://www.icourse163.org/home.htm",
		// 网易只在真正登录后才下发 NTES_SESS，用它判断比看页面靠谱。
		// 网易真正的会话 cookie 叫 NTES_YD_SESS（老文档里的 NTES_SESS 早就不用了）。
		check: async (page, context) => (await context.cookies()).some((cookie) => /^NTES_YD_SESS$|^STUDY_INFO$/.test(cookie.name) && cookie.value)
	},
	zhihuishu: {
		label: "智慧树",
		start: "https://hike-teaching-center.polymas.com/stu-hike/agent-course-hike/ai-course-center",
		// 只看 cookie 会误判：user.zhihuishu.com 的 JSESSIONID 是登录前的临时会话，
		// 带着它照样被踢回登录页。必须同时满足"停在 polymas 上"和"有 polymas 自己的令牌"。
		check: async (page, context) => {
			const url = new URL(page.url());
			if (!/(^|\.)polymas\.com$/.test(url.hostname)) return false;
			if (/login|passport/i.test(url.pathname)) return false;
			const cookies = await context.cookies();
			return cookies.some((cookie) => /^polymas-token$|^hike-polymas-identity$/i.test(cookie.name) && cookie.value);
		}
	}
};

function stateFile(site) {
	mkdirSync(COOKIE_DIR, { recursive: true });
	return join(COOKIE_DIR, `${site}.json`);
}

function readState(site) {
	try {
		return JSON.parse(readFileSync(stateFile(site), "utf8"));
	} catch {
		return null;
	}
}

function writeState(site, value) {
	writeFileSync(stateFile(site), JSON.stringify(value), { mode: 0o600 });
}

async function launch() {
	const { chromium } = await import(PLAYWRIGHT);
	return chromium.launch({
		executablePath: CHROME,
		headless: process.env.TONGJI_PANEL_HEADLESS !== "0" ? false : false,
		chromiumSandbox: process.env.TONGJI_ONLINE_CHROME_SANDBOX !== "0",
		...(process.env.TONGJI_ONLINE_CHROME_SANDBOX === "0" ? { args: ["--no-sandbox"] } : {})
	});
}

function emit(payload, code = 0) {
	process.stdout.write(JSON.stringify(payload));
	process.exit(code);
}

// 提取器：每个站点一个，返回 [{title, meta, due, url}]
const EXTRACTORS = {
	async chaoxing(page) {
		// 收件箱入口的 onclick 里带着一次性 s 参数，先取出来再跳通知页。
		const noticeUrl = await page.evaluate(() => {
			const node = [...document.querySelectorAll("[name='收件箱'], [onclick*='myNotice']")][0];
			const raw = node?.getAttribute("onclick") ?? "";
			const match = raw.match(/https:\/\/notice\.chaoxing\.com\/pc\/notice\/myNotice[^'"]*/);
			return match ? match[0] : "";
		});
		if (!noticeUrl) return [];
		await page.goto(noticeUrl, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
		await page.waitForTimeout(5000);
		return page.evaluate(() => {
			const out = [];
			const seen = new Set();
			for (const row of document.querySelectorAll(".dataBody_item, [class*='dataBody_item']")) {
				const lines = String(row.innerText || "")
					.split("\n")
					.map((line) => line.trim())
					.filter(Boolean);
				const title = lines[0] ?? "";
				if (!title || seen.has(title)) continue;
				seen.add(title);
				const dateLine = lines.find((line) => /^\d{2}-\d{2}/.test(line)) ?? "";
				const sender = lines.find((line) => line.startsWith("发件人"))?.replace(/^发件人：/, "").replace(/已读：.*$/, "").trim() ?? "";
				out.push({ title: title.slice(0, 200), meta: sender, due: dateLine.replace(/\(.*?\)/, "").trim(), url: "" });
			}
			return out.slice(0, 40);
		});
	},
	async mooc(page) {
		// 个人中心 → “SPOC课程(N)”标签 → 课程卡。
		// MOOC 网页版没有跨课程的待办清单，这里给的是课程进度和学期结束时间。
		await page.waitForTimeout(2500);
		const tab = await page.$(".u-st-spoc-course");
		if (tab) {
			await tab.click().catch(() => {});
			await page.waitForTimeout(4500);
		}
		return page.evaluate(() => {
			const out = [];
			const seen = new Set();
			for (const card of document.querySelectorAll(".course-card-wrapper")) {
				const lines = String(card.innerText || "")
					.split("\n")
					.map((line) => line.trim())
					.filter(Boolean);
				if (!lines.length) continue;
				const term = lines.find((line) => /^\d{4}年(春|秋|夏)$/.test(line)) ?? "";
				const end = lines.find((line) => /学期结束/.test(line)) ?? "";
				const progress = lines.find((line) => /已学|已更新|未开始/.test(line)) ?? "";
				const score = lines.find((line) => /分$/.test(line)) ?? "";
				const title = lines.find((line) => line !== term && line !== end && line !== progress && line !== score && !/^同济大学$/.test(line)) ?? "";
				const clean = title.replace(/^\d{4}年(春|秋|夏)\s*/, "").trim();
				if (!clean || seen.has(clean)) continue;
				seen.add(clean);
				out.push({
					title: clean.slice(0, 120),
					meta: [term, progress, score.replace(/\s+/g, "")].filter(Boolean).join(" · ").slice(0, 120),
					due: end.replace("学期结束", "").trim(),
					url: "https://www.icourse163.org/home.htm"
				});
			}
			return out.slice(0, 20);
		});
	},
	async zhihuishu(page) {
		// 待办任务页是独立路由，直接进；每张卡片里“截止时间：/所属课程：”是固定格式。
		await page.goto("https://hike-teaching-center.polymas.com/stu-hike/studyTask", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
		await page.waitForTimeout(7000);
		// 进站时还在 polymas，跳过去才被踢回登录页 —— 这种情况不能当"0 项"糊弄过去。
		if (!/(^|\.)polymas\.com$/.test(new URL(page.url()).hostname)) {
			throw Object.assign(new Error("智慧树登录已失效"), { code: "LOGIN_REQUIRED" });
		}
		return page.evaluate(() => {
			const out = [];
			const seen = new Set();
			for (const node of document.querySelectorAll("div, li, section")) {
				const text = String(node.innerText || "");
				if (!/截止时间：/.test(text) || text.length > 260) continue;
				const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
				const title = lines[0] ?? "";
				// 父容器也会命中“截止时间：”，第一行就是截止时间的跳过。
				if (!title || seen.has(title) || /^(截止时间|所属课程)/.test(title)) continue;
				seen.add(title);
				const kind = lines.find((line) => /^(作业|测试|考试|讨论|视频|课件|任务)$/.test(line)) ?? "";
				const dueLine = lines.find((line) => line.startsWith("截止时间")) ?? "";
				const courseLine = lines.find((line) => line.startsWith("所属课程")) ?? "";
				out.push({
					title: title.slice(0, 160),
					meta: [kind, courseLine.replace(/^所属课程：/, "")].filter(Boolean).join(" · ").slice(0, 120),
					due: dueLine.replace(/^截止时间：/, "").trim(),
					url: "https://hike-teaching-center.polymas.com/stu-hike/studyTask"
				});
			}
			return out.slice(0, 60);
		});
	}
};

const site = process.argv[2];
const mode = process.argv[3] ?? "";
if (!SITES[site]) emit({ ok: false, error: `unknown site: ${site}` }, 2);

const config = SITES[site];
const saved = readState(site);
const browser = await launch();
try {
	const context = await browser.newContext({
		...(saved ? { storageState: saved } : {}),
		viewport: { width: 1280, height: 900 },
		locale: "zh-CN",
		timezoneId: "Asia/Shanghai",
		serviceWorkers: "block"
	});
	const page = await context.newPage();
	await page.goto(config.start, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
	await page.bringToFront().catch(() => {});

	// 刷新模式只等 20 秒：没登录就立刻返回，由宿主去开登录窗口，别把面板卡住。
	const deadline = Date.now() + (mode === "--login" ? 10 * 60 * 1000 : 20 * 1000);
	let loggedIn = false;
	while (Date.now() < deadline) {
		if (await config.check(page, context).catch(() => false)) {
			loggedIn = true;
			break;
		}
		await page.waitForTimeout(2000);
	}
	if (!loggedIn) {
		await browser.close().catch(() => {});
		emit({ ok: false, code: "LOGIN_REQUIRED", error: `${config.label} 没有登录（等待超时）` }, 3);
	}
	writeState(site, await context.storageState());
	if (mode === "--login") {
		await browser.close().catch(() => {});
		emit({ ok: true, loggedIn: true });
	}

	await page.waitForTimeout(4000);
	let items;
	try {
		items = await EXTRACTORS[site](page);
	} catch (error) {
		if (error?.code === "LOGIN_REQUIRED") {
			await browser.close().catch(() => {});
			emit({ ok: false, code: "LOGIN_REQUIRED", error: `${config.label} 登录已失效` }, 3);
		}
		items = [];
	}
	await browser.close().catch(() => {});
	emit({ ok: true, items, note: `${items.length} 项` });
} catch (error) {
	await browser.close().catch(() => {});
	emit({ ok: false, code: "SCRAPE_FAILED", error: String(error?.message ?? error).slice(0, 300) }, 1);
}
