// 路径与外部依赖只在这里定，别处不要自己拼。
//
// 状态目录默认 ~/.dsh/state/tongji-online，和「同济校园助手」插件强制传入的
// TONGJI_ONLINE_HOME 完全一致 —— 老版本默认到 ~/Library/Application Support，
// 结果终端手跑和插件看到的是两份登录态，这里不再有那个坑。
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DSH_HOME = process.env.DSH_HOME || join(homedir(), ".dsh");

const absolute = (value) => (typeof value === "string" && value && isAbsolute(value) ? value : "");

export const STATE_DIR = absolute(process.env.TONGJI_ONLINE_HOME) || join(DSH_HOME, "state", "tongji-online");
export const SESSION_FILE = join(STATE_DIR, "session.json");
export const LOCK_FILE = join(STATE_DIR, "operation.lock");
export const BROWSER_PROFILE = join(STATE_DIR, "browser-profile");

export const CHROME =
	absolute(process.env.TONGJI_ONLINE_CHROME) ||
	(process.platform === "darwin"
		? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
		: process.platform === "win32"
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: "/usr/bin/google-chrome");

// 插件会传 0（它的子进程里 Chromium 沙箱常常起不来）。
export const CHROMIUM_SANDBOX = process.env.TONGJI_ONLINE_CHROME_SANDBOX !== "0";

export const LOGIN_TIMEOUT = Number(process.env.TONGJI_ONLINE_LOGIN_TIMEOUT || 300);

export function playwrightEntry() {
	const configured = absolute(process.env.TONGJI_ONLINE_PLAYWRIGHT);
	if (configured) return configured;
	const candidates = [
		join(SKILL_ROOT, "node_modules", "playwright-core", "index.mjs"),
		join(DSH_HOME, "plugins", "tongji-online-sidebar", "node_modules", "playwright-core", "index.mjs")
	];
	return candidates.find((path) => existsSync(path)) ?? candidates[0];
}

export function ensureStateDir() {
	mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
	return STATE_DIR;
}
