// 图书馆：检索和书目详情完全公开，不需要登录；只有「我的借阅」要 jwt。
// 所以 search / item / holdings 在未登录时也能用，这是和老版本最大的行为差别之一。
import { cookieHeader, serviceData } from "./session.mjs";
import { CampusError } from "./errors.mjs";
import { parseJson, request } from "./http.mjs";

const ORIGIN = "https://webpac.tongji.edu.cn";
const LABEL = "图书馆";
const BASE_HEADERS = {
	mappingPath: "s12",
	groupCode: "201571",
	"x-lang": "CHI",
	"content-language": "zh_CN",
	accept: "application/json"
};

const ALLOW = [
	{ path: /^\/find\/homePage\/getGroupCode$/, params: [] },
	{ path: /^\/find\/unify\/search$/, params: [] },
	{ path: /^\/find\/physical\/groupitems$/, params: [] },
	{ path: /^\/find\/searchResultDetail\/getBookDetail$/, params: ["recordId"] },
	{ path: /^\/oga\/userinfo$/, params: [] },
	{ path: /^\/find\/loanInfo\/loanList$/, params: [] }
];

const FIELDS = { keyword: "keyWord", title: "title", author: "author", isbn: "isbn" };

function authHeaders(doc) {
	const headers = { ...BASE_HEADERS };
	const data = serviceData(doc, "library");
	if (data?.jwt && data?.jwtHeader) headers[data.jwtHeader] = data.jwt;
	const cookie = cookieHeader(doc, "webpac.tongji.edu.cn");
	if (cookie) headers.cookie = cookie;
	return headers;
}

async function post(path, body, doc) {
	const result = await request(`${ORIGIN}${path}`, {
		label: LABEL,
		allowlist: ALLOW,
		method: "POST",
		headers: authHeaders(doc),
		body
	});
	const payload = parseJson(result.text, LABEL);
	if (payload?.success === false) {
		throw new CampusError("SERVICE_UNAVAILABLE", `${LABEL}返回失败：${payload?.message ?? "未知原因"}`);
	}
	return payload?.data ?? null;
}

async function get(path, doc) {
	const result = await request(`${ORIGIN}${path}`, {
		label: LABEL,
		allowlist: ALLOW,
		headers: authHeaders(doc)
	});
	const payload = parseJson(result.text, LABEL);
	if (payload?.success === false) {
		throw new CampusError("SERVICE_UNAVAILABLE", `${LABEL}返回失败：${payload?.message ?? "未知原因"}`);
	}
	return payload?.data ?? null;
}

export async function verify(doc) {
	const cookie = cookieHeader(doc, "webpac.tongji.edu.cn");
	const data = serviceData(doc, "library");
	if (!cookie && !data?.jwt) return { authenticated: false, reason: "没有图书馆登录态" };
	const info = await get("/oga/userinfo", doc);
	return { authenticated: Boolean(info), user: info ?? null };
}

export async function search(doc, { query, field = "keyword", page = 1, limit = 10 } = {}) {
	const text = String(query ?? "").trim();
	if (!text) throw new CampusError("INVALID_ARGUMENT", "检索词不能为空");
	const rows = Number(limit);
	const size = Number.isFinite(rows) ? Math.min(Math.max(Math.trunc(rows), 1), 50) : 10;
	const current = Math.max(Number(page) || 1, 1);
	const data = await post(
		"/find/unify/search",
		{
			searchField: FIELDS[field] ?? FIELDS.keyword,
			searchFieldContent: text,
			matchMode: "2",
			docCode: [null],
			page: current,
			rows: size,
			sortField: "relevance",
			sortClause: "asc"
		},
		doc
	);
	const results = Array.isArray(data?.searchResult) ? data.searchResult : [];
	return {
		total: data?.numFound ?? results.length,
		page: current,
		limit: size,
		items: results.map((row) => ({
			recordId: row.recordId ?? null,
			title: row.title ?? "",
			author: row.author ?? "",
			publisher: row.publisher ?? "",
			isbn: row.isbn ?? "",
			year: row.publishDate ?? row.year ?? ""
		}))
	};
}

export async function item(doc, recordId) {
	const id = String(recordId ?? "").trim();
	if (!/^\d+$/.test(id)) throw new CampusError("INVALID_ARGUMENT", `书目 ID 必须是数字：${recordId}`);
	const data = await get(`/find/searchResultDetail/getBookDetail?recordId=${encodeURIComponent(id)}`, doc);
	const fields = (Array.isArray(data?.bean2List) ? data.bean2List : []).map((row) => ({
		key: row.key ?? "",
		label: row.description ?? row.key ?? "",
		value: row.fieldVal ?? ""
	}));
	return { recordId: id, author: data?.author ?? "", fields };
}

export async function holdings(doc, recordId) {
	const id = String(recordId ?? "").trim();
	if (!/^\d+$/.test(id)) throw new CampusError("INVALID_ARGUMENT", `书目 ID 必须是数字：${recordId}`);
	const data = await post(
		"/find/physical/groupitems",
		{ recordId: Number(id), entrance: null, isUnify: true, page: 1, rows: 100, year: null, processType: null, locationId: null },
		doc
	);
	const rows = Array.isArray(data) ? data : (data?.list ?? []);
	return rows.map((row) => ({
		callNo: row.callNo ?? "",
		location: row.locationName ?? "",
		status: row.processType ?? "",
		shelf: row.curLocationName ?? ""
	}));
}

export async function loans(doc) {
	// 未登录时服务端只回一句「系统访问中断」，看不出是要登录，所以先自己判一次。
	const cookie = cookieHeader(doc, "webpac.tongji.edu.cn");
	const data = serviceData(doc, "library");
	if (!cookie && !data?.jwt) {
		throw new CampusError("LOGIN_REQUIRED", "图书馆没有登录态", "运行 auth login --service library");
	}
	const result = await post(
		"/find/loanInfo/loanList",
		{ page: 1, rows: 100, searchType: 1, searchContent: "", sortType: 0, startDate: null, endDate: null },
		doc
	);
	// 借阅列表在 searchResult 里，不是 list/records；应还日期字段叫 normReturnDate。
	const list = Array.isArray(result) ? result : (result?.searchResult ?? result?.list ?? result?.records ?? []);
	return list.map((row) => ({
		title: row.title ?? row.bookName ?? "",
		author: row.author ?? "",
		callNo: row.callNo ?? "",
		location: row.curLocationName ?? row.locationName ?? "",
		borrowedAt: row.loanDate ?? row.borrowDate ?? "",
		dueAt: row.normReturnDate ?? row.returnDate ?? row.dueDate ?? "",
		renewable: Number(row.surplusRenewTimes ?? 0) || 0,
		barcode: row.barcode ?? ""
	}));
}

export { ORIGIN as LIBRARY_ORIGIN };
