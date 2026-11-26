// 一个极简的 pid 锁：同一时刻只允许一个进程开浏览器（扫码窗口、抓取任务）。
// 插件那边有 clearStaleLock() 会删这个文件，所以锁必须「可被外部安全删掉」：
// 拿不到锁时先看 pid 还活着没，死了就自己接手，不要傻等。
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { LOCK_FILE } from "./env.mjs";
import { CampusError } from "./errors.mjs";

function alive(pid) {
	if (!Number.isInteger(pid) || pid <= 0) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return error?.code === "EPERM";
	}
}

function holder() {
	try {
		const raw = JSON.parse(readFileSync(LOCK_FILE, "utf8"));
		return { pid: Number(raw?.pid), at: Number(raw?.at) || 0 };
	} catch {
		return null;
	}
}

export function acquire({ waitMs = 0 } = {}) {
	const existing = holder();
	if (existing && existing.pid !== process.pid && alive(existing.pid)) {
		if (waitMs <= 0) {
			throw new CampusError(
				"SESSION_BUSY",
				`另一个进程（pid ${existing.pid}）正在使用登录态`,
				"等它结束再试；如果确认那个进程已经卡死，删掉 " + LOCK_FILE + " 后重试"
			);
		}
		const deadline = Date.now() + waitMs;
		while (Date.now() < deadline) {
			const now = holder();
			if (!now || !alive(now.pid)) break;
			// 同步小睡：这里在 CLI 冷启动路径上，不值得引入异步等待。
			try {
				Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
			} catch {
				break;
			}
		}
	}
	writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, at: Date.now() }), { mode: 0o600 });
	return () => release();
}

export function release() {
	const existing = holder();
	if (existing && existing.pid !== process.pid) return;
	try {
		rmSync(LOCK_FILE, { force: true });
	} catch {}
}

export function withLock(fn, options = {}) {
	const done = acquire(options);
	try {
		return fn();
	} finally {
		done();
	}
}

export async function withLockAsync(fn, options = {}) {
	const done = acquire(options);
	try {
		return await fn();
	} finally {
		done();
	}
}
