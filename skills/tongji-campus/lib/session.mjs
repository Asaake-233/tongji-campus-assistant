// 登录态存成一个 JSON：cookie + 各站点抓到的 token。
//
// 插件直接读这个文件（config.mjs 的 SESSION_FILE），所以结构必须稳定：
//   { version, updatedAt, cookies:[{name,value,domain,path,expires,httpOnly,secure,sameSite}],
//     origins:[{origin,localStorage}],
//     serviceData:{ canvas:{...}, education:{sessionId}, library:{jwt,jwtHeader}, card:{...}, space:{...} } }
// 只增字段，不改已有字段含义。
import { chmodSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { SESSION_FILE, STATE_DIR } from "./env.mjs";
import { CampusError } from "./errors.mjs";

const EMPTY = () => ({ version: 2, updatedAt: null, cookies: [], origins: [], serviceData: {} });

// 统一认证那套 cookie 里混着大量 name 为 SameSite 的脏数据（浏览器写 storageState
// 时把属性当 cookie 存了），回填时会让 Playwright 报错，读的时候过滤掉。
const JUNK_NAMES = new Set(["SameSite", "HttpOnly", "Secure", "Path", "Domain", "Expires", "Max-Age", "Priority"]);

function cleanCookies(cookies) {
	if (!Array.isArray(cookies)) return [];
	const seen = new Set();
	const out = [];
	for (const c of cookies) {
		if (!c || typeof c.name !== "string" || typeof c.value !== "string") continue;
		if (!c.name || JUNK_NAMES.has(c.name)) continue;
		const domain = typeof c.domain === "string" ? c.domain : "";
		const path = typeof c.path === "string" && c.path.startsWith("/") ? c.path : "/";
		const key = `${domain}\u0000${path}\u0000${c.name}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const row = { name: c.name, value: c.value, domain, path };
		if (typeof c.expires === "number" && c.expires > 0) row.expires = c.expires;
		if (typeof c.httpOnly === "boolean") row.httpOnly = c.httpOnly;
		if (typeof c.secure === "boolean") row.secure = c.secure;
		if (typeof c.sameSite === "string") row.sameSite = c.sameSite;
		out.push(row);
	}
	return out;
}

export function readSession() {
	let raw;
	try {
		raw = readFileSync(SESSION_FILE, "utf8");
	} catch {
		return EMPTY();
	}
	let doc;
	try {
		doc = JSON.parse(raw);
	} catch {
		return EMPTY();
	}
	if (!doc || typeof doc !== "object") return EMPTY();
	return {
		version: 2,
		updatedAt: doc.updatedAt ?? null,
		cookies: cleanCookies(doc.cookies),
		origins: Array.isArray(doc.origins) ? doc.origins : [],
		serviceData: doc.serviceData && typeof doc.serviceData === "object" ? doc.serviceData : {}
	};
}

export function writeSession(doc) {
	const next = {
		version: 2,
		updatedAt: new Date().toISOString(),
		cookies: cleanCookies(doc.cookies),
		origins: Array.isArray(doc.origins) ? doc.origins : [],
		serviceData: doc.serviceData && typeof doc.serviceData === "object" ? doc.serviceData : {}
	};
	const tmp = `${SESSION_FILE}.${process.pid}.tmp`;
	writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
	renameSync(tmp, SESSION_FILE);
	try {
		chmodSync(SESSION_FILE, 0o600);
	} catch {}
	return next;
}

export function clearSession() {
	for (const path of [SESSION_FILE, `${SESSION_FILE}.${process.pid}.tmp`]) {
		try {
			rmSync(path, { force: true });
		} catch {}
	}
}

// 插件用 tongjiCookie() 从 cookies 里拼 Cookie 头，规则要和这里一致：
// 只要 domain 落在 *.tongji.edu.cn 下的都算，按 domain 长度降序，避免
// 同名 cookie 被短域覆盖。
export function tongjiCookies(doc = readSession(), host = "") {
	const rows = (doc.cookies || []).filter((c) => {
		const domain = String(c.domain || "").replace(/^\./, "");
		if (!/(^|\.)tongji\.edu\.cn$/.test(domain)) return false;
		if (!host) return true;
		const bare = host.replace(/^\./, "");
		return bare === domain || bare.endsWith(`.${domain}`);
	});
	return rows.sort((a, b) => String(b.domain).length - String(a.domain).length);
}

export function cookieHeader(doc = readSession(), host = "") {
	const rows = tongjiCookies(doc, host);
	if (!rows.length) return "";
	return rows.map((c) => `${c.name}=${c.value}`).join("; ");
}

export function serviceData(doc = readSession(), key) {
	const value = doc.serviceData?.[key];
	return value && typeof value === "object" ? value : {};
}

// 判断某个站点是否还有「看起来能用」的登录态。只做粗筛，真正有效性靠一次探测请求。
export function hasCookiesFor(doc, domain) {
	const bare = domain.replace(/^\./, "");
	return (doc.cookies || []).some((c) => {
		const d = String(c.domain || "").replace(/^\./, "");
		return d === bare || d.endsWith(`.${bare}`);
	});
}

export function assertStateSafe() {
	try {
		const stat = readFileSync(`${STATE_DIR}/.probe`, "utf8");
		void stat;
	} catch {}
	return true;
}

export { CampusError };
