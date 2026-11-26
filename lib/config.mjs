// 路径解析：所有外部依赖（技能脚本、状态目录、Playwright、Chrome）都在这里定，
// 别处不要再自己拼路径。每一项都能用环境变量覆盖，装到别人的机器上不用改代码。
//
// 默认值假设插件装在 <工作区>/.dsh/plugins/tongji-online-sidebar/lib/，
// 也就是开发时的位置；用 npm 装到 profile 里时，靠环境变量指过去。
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const DSH_HOME = process.env.DSH_HOME || join(homedir(), ".dsh");
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

function absolute(value) {
	return typeof value === "string" && value && isAbsolute(value) ? value : "";
}

// 插件自己的根目录（lib 的上一级），用于写日志之类的自带文件。
export const PACKAGE_ROOT = resolve(HERE, "..");

// 工作区根：从这里往下找 .dsh/skills 与 .dsh/state。
// 默认按开发时的四层上推；装到 profile 里时用 DSH_WORKSPACE 指定。
export const WORKSPACE = absolute(process.env.DSH_WORKSPACE) || homedir();

// 技能脚本入口。tongji-campus 技能负责登录、Canvas、图书馆这些查询，
// 面板只是把它的输出读出来。
export const SKILL =
	absolute(process.env.TONGJI_ONLINE_SKILL) || join(DSH_HOME, "skills", "tongji-campus", "scripts", "run.mjs");

// 状态目录：登录态、缓存、开关都放这里。
export const STATE_DIR = absolute(process.env.TONGJI_ONLINE_HOME) || join(DSH_HOME, "state", "tongji-online");

export const CACHE_FILE = join(STATE_DIR, "panel-cache.json");
export const SETTINGS_FILE = join(STATE_DIR, "settings.json");
export const COOKIE_DIR = join(STATE_DIR, "panel-cookies");

// Playwright 用技能里装的那一份，避免插件自己再带一个几十 MB 的依赖。
// 找不到就返回空串，调用方会给出可读的报错。
export const PLAYWRIGHT = (() => {
	const configured = absolute(process.env.TONGJI_ONLINE_PLAYWRIGHT);
	if (configured) return configured;
	const candidates = [
		join(DSH_HOME, "skills", "tongji-campus", "node_modules", "playwright-core", "index.mjs"),
		join(PACKAGE_ROOT, "node_modules", "playwright-core", "index.mjs")
	];
	return candidates.find((path) => existsSync(path)) ?? candidates[0];
})();

// 用系统装的 Chrome 而不是 Playwright 自带的那份：登录窗口要能被看见，
// 而且用户的统一认证 cookie 本来就在 Chrome 里。
export const CHROME =
	absolute(process.env.TONGJI_ONLINE_CHROME) ||
	(process.platform === "darwin"
		? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
		: process.platform === "win32"
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: "/usr/bin/google-chrome");

// 技能自己的登录态文件，1系统公告要读里面的 sessionId 和 cookie。
export const SESSION_FILE = join(STATE_DIR, "session.json");

export { HERE, homedir };
