// 所有对外请求都从这里走。三件事必须守住：
//   1. 只允许白名单里的路径 —— 这个技能的输入可能来自模型，不能变成任意 URL 的代理。
//   2. 响应体有上限 —— 一个坏掉的接口不该把内存吃光。
//   3. 状态码映射成可读错误 —— 401 就该说「要重新登录」，而不是把 JSON 甩给用户。
import { CampusError } from "./errors.mjs";

const MAX_BYTES = 5 * 1024 * 1024;

export function assertPath(url, allowlist, label) {
	let pathname;
	let query;
	try {
		const parsed = new URL(url);
		pathname = parsed.pathname;
		query = parsed.searchParams;
	} catch {
		throw new CampusError("INVALID_ARGUMENT", `不是合法的 URL：${url}`);
	}
	const rule = allowlist.find((item) => item.path.test(pathname));
	if (!rule) {
		throw new CampusError("INVALID_ARGUMENT", `${label} 不允许访问这个路径：${pathname}`);
	}
	if (rule.params) {
		for (const key of query.keys()) {
			if (!rule.params.includes(key) && !key.endsWith("[]")) {
				throw new CampusError("INVALID_ARGUMENT", `${label} 不允许这个查询参数：${key}`);
			}
		}
	}
	return true;
}

function statusError(status, label) {
	if (status === 401 || status === 403) {
		return new CampusError("LOGIN_REQUIRED", `${label} 登录已失效`, "运行 auth login 重新登录（需要扫码）");
	}
	if (status === 429) {
		return new CampusError("RATE_LIMITED", `${label} 请求太频繁`, "等一两分钟再试");
	}
	if (status >= 500) {
		return new CampusError("SERVICE_UNAVAILABLE", `${label} 服务端出错（HTTP ${status}）`, "稍后再试");
	}
	return new CampusError("UNEXPECTED", `${label} 返回 HTTP ${status}`);
}

export async function request(url, { label = "服务", allowlist = [], method = "GET", headers = {}, body = null, redirect = "manual" } = {}) {
	if (allowlist.length) assertPath(url, allowlist, label);
	const init = { method, headers: { ...headers }, redirect };
	if (body !== null && body !== undefined) {
		init.body = typeof body === "string" ? body : JSON.stringify(body);
		if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
			init.headers["content-type"] = "application/json";
		}
	}
	let response;
	try {
		response = await fetch(url, init);
	} catch (error) {
		throw new CampusError("NETWORK_ERROR", `连不上${label}：${error?.message ?? error}`, "检查网络或校园网/VPN 是否正常");
	}
	if (response.status >= 300 && response.status < 400) {
		return { status: response.status, location: response.headers.get("location") ?? "", text: "" };
	}
	if (!response.ok) throw statusError(response.status, label);
	const text = await readCapped(response, label);
	return { status: response.status, location: "", text, headers: response.headers };
}

async function readCapped(response, label) {
	const declared = Number(response.headers.get("content-length") || 0);
	if (declared > MAX_BYTES) {
		throw new CampusError("RESULT_TOO_LARGE", `${label} 的响应太大（${Math.round(declared / 1024 / 1024)}MB）`);
	}
	const buffer = await response.arrayBuffer();
	if (buffer.byteLength > MAX_BYTES) {
		throw new CampusError("RESULT_TOO_LARGE", `${label} 的响应超过 5MB`);
	}
	return new TextDecoder("utf-8").decode(buffer);
}

export function parseJson(text, label) {
	try {
		return JSON.parse(text);
	} catch {
		throw new CampusError("PAGE_CHANGED", `${label} 返回的不是 JSON`, "接口可能改版了，检查 references 里的说明");
	}
}

export { MAX_BYTES };
