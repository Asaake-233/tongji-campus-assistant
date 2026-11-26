// 一卡通：只能靠浏览器。站点是 Vue 单页应用，余额是点「余额查询」后异步渲染出来的，
// 没有可直接调的接口 —— 所以这里老老实实点按钮、等文本出现、再解析。
import { CampusError } from "./errors.mjs";
import { absorb, openPage, withBrowser } from "./browser.mjs";

const HOME = "https://yikatong.tongji.edu.cn/";
const SERVICE = "https://yikatong.tongji.edu.cn/ppage/service";
const LABEL = "一卡通";

const AMOUNT = /账户总额[:：]\s*￥?\s*(-?[\d,]+(?:\.\d+)?)/;
const ACCOUNT = /(\S*卡账户)\s*余额\s*\1?\s*(-?[\d,]+(?:\.\d+)?)/g;

// 页面里出现了登录表单的标志性文字，就认为没登录。
async function looksLoggedOut(page) {
	const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
	return /统一认证登陆|统一认证登录|获取验证码/.test(text);
}

// 页面上的按钮有时是 onclick 属性、有时是纯文本，写法还不统一。
// Playwright 不允许把 `text=` 引擎和 CSS 选择器写在同一个逗号列表里
// （会报 "Unexpected token ="），所以逐个试，谁先出现用谁。
async function firstMatch(page, selectors) {
	for (const selector of selectors) {
		const locator = page.locator(selector).first();
		if (await locator.count().catch(() => 0)) return locator;
	}
	return null;
}

// 等某个正则出现在页面文本里。固定 sleep 5 秒在网慢时不够、网快时白等。
async function waitForText(page, regex, timeoutMs = 30000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
		if (regex.test(text)) return text;
		await page.waitForTimeout(500);
	}
	return page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
}

export async function balance() {
	return withBrowser(async (context) => {
		const page = await openPage(context, HOME);
		await page.waitForTimeout(1500);

		// 未登录时 SPA 不会跳转，只是把登录表单显示在首页里 —— 光看 URL 判断不出来。
		// 认两个信号：跳到了 iam，或者页面上出现了「统一认证登陆 / 获取验证码」。
		if (/login|authn|iam\.tongji/i.test(page.url()) || (await looksLoggedOut(page))) {
			throw new CampusError(
				"LOGIN_REQUIRED",
				"一卡通需要先登录统一认证",
				"运行 auth login --service card 打开登录窗口扫码"
			);
		}

		await page.goto(SERVICE, { waitUntil: "domcontentloaded" }).catch(() => {});
		await page.waitForTimeout(2000);

		const button = await firstMatch(page, ['[onclick*="余额查询"]', ':text("余额查询")', 'button:has-text("余额查询")']);
		if (button) {
			await button.click({ timeout: 10000 }).catch(() => {});
		}

		const text = await waitForText(page, AMOUNT, 30000);
		const total = AMOUNT.exec(text);
		const accounts = [];
		for (const match of text.matchAll(ACCOUNT)) {
			accounts.push({ name: match[1].trim(), balance: Number(match[2].replace(/,/g, "")) });
		}

		if (!total && !accounts.length) {
			throw new CampusError(
				"PAGE_CHANGED",
				"页面上找不到余额信息",
				"页面可能改版了；打开 " + SERVICE + " 手动看一眼结构"
			);
		}

		await absorb(context).catch(() => {});
		return {
			total: total ? Number(total[1].replace(/,/g, "")) : null,
			accounts,
			checkedAt: new Date().toISOString()
		};
	});
}

// 消费流水：站点上是一个可按月份筛的表。这里只做「把当前可见的行抓下来」，
// 不做翻页穷举 —— 面板只要最近一页的概览。
export async function transactions({ month = null } = {}) {
	return withBrowser(async (context) => {
		const page = await openPage(context, SERVICE);
		await page.waitForTimeout(2000);
		if (/login|authn|iam\.tongji/i.test(page.url()) || (await looksLoggedOut(page))) {
			throw new CampusError("LOGIN_REQUIRED", "一卡通需要先登录统一认证", "运行 auth login --service card");
		}
		const tab = await firstMatch(page, [':text("消费流水")', '[onclick*="消费流水"]', '[onclick*="交易明细"]']);
		if (tab) {
			await tab.click({ timeout: 10000 }).catch(() => {});
			await page.waitForTimeout(2500);
		}
		const rows = await page.evaluate(() => {
			const table = document.querySelector("table");
			if (!table) return [];
			return [...table.querySelectorAll("tr")].map((tr) =>
				[...tr.querySelectorAll("td,th")].map((td) => (td.innerText || "").trim())
			);
		});
		await absorb(context).catch(() => {});
		const header = rows[0] ?? [];
		const body = rows.slice(1).filter((row) => row.some(Boolean));
		return {
			month: month ?? null,
			header,
			rows: body,
			count: body.length,
			note: body.length ? "" : "没有抓到表格行；站点可能需要先选月份，或表格在 iframe 里"
		};
	});
}
