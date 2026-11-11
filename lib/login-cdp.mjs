// 用一个"真·Chrome 窗口"做 MOOC / 智慧树的登录：
// 直接 spawn Chrome 可执行文件（不是 `open`，`open -na --args` 会把参数丢掉、
// CDP 端口起不来），带独立 user-data-dir 和调试端口，再用 CDP 连上去等登录、
// 保存 storageState。窗口是普通 Chrome 窗口，能正常出现在 Dock 和前台。
//
// 用法：node login-cdp.mjs [mooc|zhihuishu|both]
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CHROME, COOKIE_DIR, PLAYWRIGHT, STATE_DIR } from "./config.mjs";

const PROFILE = join(STATE_DIR, "chrome-login-profile");
const PORT = Number(process.env.TONGJI_ONLINE_CDP_PORT || 9333);

// 登录判定和 scrape.mjs 里的 check 必须一致，否则这边刚"登录成功"、
// 那边刷新又判未登录，来回弹窗。
// 网易真正的会话 cookie 是 NTES_YD_SESS，老文档里的 NTES_SESS 早就不用了。
const loggedInMooc = async (context) =>
	(await context.cookies()).some((c) => /^NTES_YD_SESS$|^STUDY_INFO$/.test(c.name) && c.value);

const TARGETS = {
	mooc: {
		label: "中国大学 MOOC",
		url: "https://www.icourse163.org/home.htm",
		check: loggedInMooc
	},
	zhihuishu: {
		label: "智慧树",
		url: "https://hike-teaching-center.polymas.com/stu-hike/agent-course-hike/ai-course-center",
		check: async (context) => {
			const cookies = await context.cookies();
			return cookies.some((c) => /polymas\.com$/.test(c.domain.replace(/^\./, "")) && /SESSION|token|uid/i.test(c.name));
		}
	}
};

const which = process.argv[2] ?? "both";
const order = which === "both" ? ["mooc", "zhihuishu"] : [which];

mkdirSync(COOKIE_DIR, { recursive: true });
mkdirSync(PROFILE, { recursive: true });

// --no-sandbox：某些沙箱环境下 Chrome 的渲染进程会直接崩掉（Trace/BPT trap: 5）。
const child = spawn(
	CHROME,
	[
		"--no-sandbox",
		`--user-data-dir=${PROFILE}`,
		`--remote-debugging-port=${PORT}`,
		"--no-first-run",
		"--no-default-browser-check",
		"--disable-features=Translate",
		"--new-window"
	],
	{ stdio: "ignore", detached: true }
);
child.unref();

async function waitForCdp(timeoutMs = 30000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
			if (response.ok) return true;
		} catch {}
		await new Promise((r) => setTimeout(r, 500));
	}
	return false;
}

// 临时 profile 是几百 MB 的垃圾，不管成功失败都清掉。
// 先杀掉那个独立 Chrome，否则文件还开着，删不干净。
function cleanup() {
	try {
		process.kill(-child.pid, "SIGTERM");
	} catch {
		try {
			child.kill("SIGTERM");
		} catch {}
	}
	try {
		rmSync(PROFILE, { recursive: true, force: true });
	} catch {}
}

function emit(payload, code = 0) {
	cleanup();
	process.stdout.write(JSON.stringify(payload));
	process.exit(code);
}

if (!(await waitForCdp())) emit({ ok: false, error: "Chrome 没起来（CDP 端口没响应）" }, 1);
// 尽量把它抬到前台，避免窗口被全屏应用挡在别的桌面。
if (process.platform === "darwin") {
	spawn("osascript", ["-e", 'tell application "Google Chrome" to activate'], { stdio: "ignore", detached: true }).unref();
}

const { chromium } = await import(PLAYWRIGHT);
const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
const context = browser.contexts()[0] ?? (await browser.newContext());
const results = {};

for (const key of order) {
	const target = TARGETS[key];
	const pages = context.pages();
	const page = pages[0] ?? (await context.newPage());
	await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
	await page.bringToFront().catch(() => {});

	const deadline = Date.now() + 10 * 60 * 1000;
	let ok = false;
	while (Date.now() < deadline) {
		if (await target.check(context).catch(() => false)) {
			ok = true;
			break;
		}
		await new Promise((r) => setTimeout(r, 2000));
	}
	results[key] = ok;
	if (!ok) {
		await browser.close().catch(() => {});
		emit({ ok: false, results, error: `${target.label} 登录超时` }, 3);
	}
	const state = await context.storageState();
	writeFileSync(join(COOKIE_DIR, `${key}.json`), JSON.stringify(state), { mode: 0o600 });
}

await browser.close().catch(() => {});
emit({ ok: true, results });
