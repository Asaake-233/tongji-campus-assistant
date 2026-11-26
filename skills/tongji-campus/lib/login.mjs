// 登录：先试静默，不行再开窗口。
//
// 统一认证（iam）的登录态如果还在，headless 走一遍跳转链就能把各站点的 cookie
// 换回来，用户什么都看不见 —— 这是最常见的情况。只有当 iam 也过期了才需要
// 开一个有头窗口让用户扫码，扫完这一份 SSO 会话对所有站点都有效。
import { CampusError } from "./errors.mjs";
import { LOGIN_TIMEOUT } from "./env.mjs";
import { absorb, withBrowser } from "./browser.mjs";
import { readSession } from "./session.mjs";
import * as canvas from "./canvas.mjs";
import * as library from "./library.mjs";
import * as education from "./education.mjs";

// 每个站点：从哪进、认哪个 origin 算成功、成功后在页面里抓什么。
const SERVICES = {
	canvas: {
		label: "Canvas",
		url: "https://canvas.tongji.edu.cn/login",
		origin: "https://canvas.tongji.edu.cn",
		landed: (url) => /^https:\/\/canvas\.tongji\.edu\.cn\//.test(url) && !/login|logout|saml|authn/i.test(new URL(url).pathname),
		capture: () => ({})
	},
	education: {
		label: "1系统",
		url: "https://1.tongji.edu.cn/api/ssoservice/system/loginIn",
		origin: "https://1.tongji.edu.cn",
		landed: (url) => {
			try {
				const parsed = new URL(url);
				return parsed.origin === "https://1.tongji.edu.cn" && !/loginIn|ssoservice|iam/i.test(parsed.pathname);
			} catch {
				return false;
			}
		},
		capture: async (page) => {
			const sessionId = await page
				.evaluate(() => sessionStorage.getItem("sessionid") || localStorage.getItem("sessionid") || "")
				.catch(() => "");
			return sessionId ? { education: { sessionId } } : {};
		}
	},
	library: {
		label: "图书馆",
		url: "https://webpac1.tongji.edu.cn/OAuth2/tongji/init?isLogout=0&refer=https://webpac.tongji.edu.cn/find/sso/login/tongji/0",
		origin: "https://webpac.tongji.edu.cn",
		landed: (url) => /^https:\/\/webpac1?\.tongji\.edu\.cn\//.test(url) && !/OAuth2|sso\/login|iam/i.test(url),
		capture: async (page, context) => {
			const grabbed = await page
				.evaluate(() => ({
					jwt: sessionStorage.getItem("jwt") || "",
					jwtHeader: sessionStorage.getItem("jwtHeader") || ""
				}))
				.catch(() => ({ jwt: "", jwtHeader: "" }));
			if (grabbed.jwt) return { library: grabbed };
			const cookies = await context.cookies("https://webpac.tongji.edu.cn").catch(() => []);
			const jwt = cookies.find((c) => c.name === "jwt")?.value ?? "";
			const jwtHeader = cookies.find((c) => c.name === "jwtHeader")?.value ?? "";
			return jwt ? { library: { jwt, jwtHeader } } : {};
		}
	},
	card: {
		label: "一卡通",
		url: "https://yikatong.tongji.edu.cn/",
		origin: "https://yikatong.tongji.edu.cn",
		// 这个 SPA 未登录也不跳转，只在首页里显示登录表单 —— 必须看页面内容，
		// 否则 URL 一匹配就立刻"登录成功"，用户永远看不到窗口。
		landed: async (url, page) => {
			if (!/^https:\/\/yikatong\.tongji\.edu\.cn\//.test(url)) return false;
			if (/iam|authn/i.test(url)) return false;
			const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
			return Boolean(text) && !/统一认证登陆|统一认证登录|获取验证码/.test(text);
		},
		capture: () => ({})
	},
	space: {
		label: "座位预约",
		url: "https://space.tongji.edu.cn/h5/#/home",
		origin: "https://space.tongji.edu.cn",
		// 同理：首页 URL 谁都能打开。真正的登录标志是 sessionStorage 里的 token。
		landed: async (url, page) => {
			if (!/^https:\/\/space\.tongji\.edu\.cn\//.test(url)) return false;
			const token = await page
				.evaluate(() => sessionStorage.getItem("token") || localStorage.getItem("token") || "")
				.catch(() => "");
			return Boolean(token);
		},
		capture: () => ({})
	}
};

export const SERVICE_NAMES = Object.keys(SERVICES);

function onIam(url) {
	try {
		return new URL(url).hostname === "iam.tongji.edu.cn";
	} catch {
		return false;
	}
}

// 在已打开的 context 里把某个站点走一遍，返回 { landed, patch }。
async function walk(context, name, { headless, timeoutMs, log }) {
	const spec = SERVICES[name];
	const page = await context.newPage();
	try {
		await page.goto(spec.url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
		const deadline = Date.now() + timeoutMs;
		let lastUrl = "";
		while (Date.now() < deadline) {
			// OAuth2 跳转链里页面可能被脚本自己关掉（换窗口 / 直接跳转），
			// 这时 page.url() 会抛，循环必须能认出来并干净退出。
			if (page.isClosed()) return { landed: false, patch: {}, url: lastUrl, closed: true };
			try {
				lastUrl = page.url();
			} catch {
				return { landed: false, patch: {}, url: lastUrl, closed: true };
			}
			if (await spec.landed(lastUrl, page)) {
				await page.waitForTimeout(1200).catch(() => {});
				// capture 有的站点是同步函数（返回字面量），有的要读页面。
				// 直接 .catch 会在同步返回值上抛 TypeError，整个登录就此崩掉。
				const patch = await Promise.resolve()
					.then(() => spec.capture(page, context))
					.catch(() => ({}));
				return { landed: true, patch, url: lastUrl };
			}
			if (!headless && onIam(lastUrl)) {
				// 有头模式下把扫码页滚到可视区，并给用户一句提示。
				await page
					.locator("#tab12Con #wx_QRImage, #tab1Con input[type=password]")
					.first()
					.scrollIntoViewIfNeeded()
					.catch(() => {});
				log?.(`${spec.label}：请在弹出的窗口里扫码或输入密码登录`);
			}
			try {
				await page.waitForTimeout(800);
			} catch {
				return { landed: false, patch: {}, url: lastUrl, closed: true };
			}
		}
		return { landed: false, patch: {}, url: lastUrl };
	} finally {
		if (!page.isClosed()) await page.close().catch(() => {});
	}
}

export async function login({ service = "canvas", timeout = LOGIN_TIMEOUT } = {}, { log } = {}) {
	const names = service === "all" ? SERVICE_NAMES : [service];
	for (const name of names) {
		if (!SERVICES[name]) {
			throw new CampusError("INVALID_ARGUMENT", `不认识的站点：${name}`, `可选：${SERVICE_NAMES.join("、")} 或 all`);
		}
	}
	const seconds = Number(timeout);
	const timeoutMs = (Number.isFinite(seconds) && seconds > 0 ? seconds : LOGIN_TIMEOUT) * 1000;
	// timeout 是「整条命令」的预算，不是每一轮各给一份。
	// 调用方（插件）在外层还有自己的超时，这里必须先花掉自己的份额再退出，
	// 否则会被 SIGKILL 掉，留下一个没人管的 Chrome 孤儿进程。
	const marginMs = 8000;
	const headlessBudget = Math.min(15000, Math.max(4000, Math.round(timeoutMs * 0.12)));
	const headedBudget = Math.max(10000, timeoutMs - headlessBudget - marginMs);

	// 第零轮：先问一句「现在还能用吗」。
	// 有些站点的 cookie 对 API 有效、但 OAuth 入口已经过期（图书馆就是这样），
	// 直接走跳转链会白开一个扫码窗口。能用就根本不该打扰用户。
	const usable = new Set();
	{
		const doc = readSession();
		for (const name of names) {
			if (name !== "canvas" && name !== "library" && name !== "education") continue;
			try {
				const probe = await verify(doc, name);
				if (probe?.authenticated) usable.add(name);
			} catch {
				// 探测失败就是不能用，留给后面的登录流程。
			}
		}
	}
	const todo = names.filter((name) => !usable.has(name));
	if (!todo.length) {
		return { authenticated: true, services: names, alreadyValid: names, stateFile: "session.json" };
	}

	// 第一轮：headless 静默。统一认证还有效时这一轮就够了。
	let patch = {};
	let pending = [];
	await withBrowser(
		async (context) => {
			for (const name of todo) {
				const result = await walk(context, name, { headless: true, timeoutMs: headlessBudget, log });
				patch = { ...patch, ...result.patch };
				if (result.landed) continue;
				// 没成功就进第二轮，不管卡在哪。
				// 原来只在「卡在 iam 上」时才排队，结果一卡通、座位这类
				// 不跳转的单页应用（URL 一直是自己的域名）会被静默判成功，
				// 用户永远等不到那个该弹的窗口。
				pending.push(name);
			}
			await absorb(context, patch).catch(() => {});
		},
		{ headless: true }
	);

	if (!pending.length) {
		return finish(patch, names);
	}

	// 第二轮：开有头窗口。用户扫一次码，所有待登录站点一起过。
	log?.(`需要手动登录：${pending.map((n) => SERVICES[n].label).join("、")}`);
	patch = await withBrowser(
		async (context) => {
			const collected = { ...patch };
			for (const name of pending) {
				const result = await walk(context, name, { headless: false, timeoutMs: headedBudget, log });
				if (!result.landed) {
					throw new CampusError(
						"LOGIN_TIMEOUT",
						`${SERVICES[name].label} 登录没有完成`,
						"窗口里扫码后要等它自己跳回学校页面；超时了可以加大 --timeout"
					);
				}
				Object.assign(collected, result.patch);
			}
			await absorb(context, collected);
			return collected;
		},
		{ headless: false }
	);

	// 走完窗口不等于登录成功：用户可能只是把窗口关了。
	// 能在线探测的站点再确认一次，别把「窗口弹过」当成「已经登录」。
	const doc = readSession();
	const unconfirmed = [];
	for (const name of names) {
		if (name !== "canvas" && name !== "library" && name !== "education") continue;
		try {
			const probe = await verify(doc, name);
			if (!probe?.authenticated) unconfirmed.push(name);
		} catch {
			unconfirmed.push(name);
		}
	}
	if (unconfirmed.length) {
		throw new CampusError(
			"LOGIN_TIMEOUT",
			`${unconfirmed.map((n) => SERVICES[n].label).join("、")} 仍未登录`,
			"窗口里扫码后要等它自己跳回学校页面；也可以再跑一次 auth login"
		);
	}

	return finish(patch, names);
}

function finish(patch, names) {
	return {
		authenticated: true,
		services: names,
		serviceData: Object.fromEntries(Object.entries(patch).map(([key, value]) => [key, Object.keys(value)])),
		stateFile: "session.json"
	};
}

// 单站点探测：登录完（或平时刷新前）用它确认到底还能不能用。
export async function verify(doc, service) {
	if (service === "canvas") return canvas.verify(doc);
	if (service === "library") return library.verify(doc);
	if (service === "education") return education.verify(doc);
	throw new CampusError("INVALID_ARGUMENT", `这个站点没有在线探测：${service}`, "可用：canvas、library、education");
}

export { SERVICES };
