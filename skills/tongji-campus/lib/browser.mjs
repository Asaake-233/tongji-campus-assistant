// Playwright 的薄封装：开 Chrome、把 session.json 的登录态灌进去、用完再收回来。
//
// 用系统 Chrome 而不是 Playwright 自带的 Chromium：统一认证的登录态本来就存在
// 用户自己的浏览器里，而且扫码窗口必须是用户看得见、点得到的真窗口。
import { CHROME, CHROMIUM_SANDBOX, STATE_DIR, playwrightEntry } from "./env.mjs";
import { CampusError } from "./errors.mjs";
import { readSession, writeSession } from "./session.mjs";

let cached = null;

async function loadPlaywright() {
	if (cached) return cached;
	try {
		cached = await import(playwrightEntry());
	} catch (error) {
		throw new CampusError(
			"DEPENDENCY_MISSING",
			"找不到 playwright-core",
			`在技能目录运行 npm ci --ignore-scripts；或者用 TONGJI_ONLINE_PLAYWRIGHT 指向 index.mjs。原始错误：${error?.message ?? error}`
		);
	}
	return cached;
}

export function storageStateFrom(doc = readSession()) {
	return { cookies: doc.cookies ?? [], origins: doc.origins ?? [] };
}

export async function withBrowser(fn, { headless = true, state = null } = {}) {
	const { chromium } = await loadPlaywright();
	const doc = state ?? readSession();
	let browser;
	try {
		browser = await chromium.launch({
			executablePath: CHROME,
			headless,
			chromiumSandbox: CHROMIUM_SANDBOX,
			args: ["--no-first-run", "--no-default-browser-check", "--disable-features=Translate"],
			timeout: 45000
		});
	} catch (error) {
		throw new CampusError(
			"BROWSER_UNAVAILABLE",
			`启动 Chrome 失败：${error?.message ?? error}`,
			`确认 ${CHROME} 存在；或者用 TONGJI_ONLINE_CHROME 指定浏览器路径`
		);
	}
	try {
		const context = await browser.newContext({
			storageState: storageStateFrom(doc),
			viewport: { width: 1280, height: 900 },
			locale: "zh-CN",
			timezoneId: "Asia/Shanghai",
			userAgent:
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
		});
		context.setDefaultTimeout(45000);
		context.setDefaultNavigationTimeout(60000);
		return await fn(context);
	} finally {
		await browser.close().catch(() => {});
	}
}

// 把浏览器里的登录态收回到 session.json。只保留学校域名下的 cookie，
// 别把第三方统计域名也写进去。
export async function absorb(context, patch = {}) {
	const fresh = await context.storageState();
	const doc = readSession();
	const next = {
		cookies: mergeCookies(doc.cookies, fresh.cookies),
		origins: mergeOrigins(doc.origins, fresh.origins),
		serviceData: { ...doc.serviceData, ...patch }
	};
	return writeSession(next);
}

function mergeCookies(oldRows, newRows) {
	const map = new Map();
	for (const row of [...(oldRows ?? []), ...(newRows ?? [])]) {
		if (!row || typeof row.name !== "string") continue;
		const domain = String(row.domain || "");
		if (domain && !/tongji\.edu\.cn$/i.test(domain.replace(/^\./, ""))) continue;
		map.set(`${domain}\u0000${row.path ?? "/"}\u0000${row.name}`, row);
	}
	return [...map.values()];
}

function mergeOrigins(oldRows, newRows) {
	const map = new Map();
	for (const row of [...(oldRows ?? []), ...(newRows ?? [])]) {
		if (!row?.origin) continue;
		if (!/tongji\.edu\.cn/i.test(row.origin)) continue;
		map.set(row.origin, row);
	}
	return [...map.values()];
}

export async function openPage(context, url) {
	const page = await context.newPage();
	await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
	return page;
}

export async function pageFetch(page, { url, method = "GET", headers = {}, body = null }) {
	return page.evaluate(
		async ({ url, method, headers, body }) => {
			const init = { method, headers: { ...headers }, credentials: "include" };
			if (body !== null && body !== undefined) {
				init.body = typeof body === "string" ? body : JSON.stringify(body);
			}
			const response = await fetch(url, init);
			const text = await response.text();
			return { status: response.status, text };
		},
		{ url, method, headers, body }
	);
}

export { STATE_DIR };
