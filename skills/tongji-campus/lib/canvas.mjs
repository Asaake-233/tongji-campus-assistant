// Canvas 走 API + cookie，不开浏览器：面板每次刷新都要拉一次，开浏览器太慢。
import { cookieHeader, serviceData } from "./session.mjs";
import { CampusError } from "./errors.mjs";
import { parseJson, request } from "./http.mjs";

const ORIGIN = "https://canvas.tongji.edu.cn";
const LABEL = "Canvas";

// 只放行读接口。这条白名单是安全边界：即使参数被注入，也打不到别的端点。
const ALLOW = [
	{ path: /^\/api\/v1\/users\/self\/profile$/, params: [] },
	{
		path: /^\/api\/v1\/courses$/,
		params: ["per_page", "page", "enrollment_state", "enrollment_type", "include[]", "override_assignment_dates"]
	},
	{
		path: /^\/api\/v1\/courses\/[1-9]\d*\/assignments$/,
		params: ["per_page", "page", "bucket", "order_by", "include[]", "override_assignment_dates"]
	}
];

export function canvasCookie(doc) {
	return cookieHeader(doc, "canvas.tongji.edu.cn");
}

export async function verify(doc) {
	const cookie = canvasCookie(doc);
	if (!cookie) return { authenticated: false, reason: "没有 Canvas cookie" };
	const result = await request(`${ORIGIN}/api/v1/users/self/profile`, {
		label: LABEL,
		allowlist: ALLOW,
		headers: { cookie, accept: "application/json" }
	});
	const profile = parseJson(result.text, LABEL);
	return {
		authenticated: true,
		user: {
			id: profile?.id ?? null,
			name: profile?.name ?? profile?.short_name ?? "",
			login: profile?.login_id ?? ""
		}
	};
}

async function listAll(path, doc) {
	const cookie = canvasCookie(doc);
	if (!cookie) throw new CampusError("LOGIN_REQUIRED", "Canvas 没有登录态", "运行 auth login --service canvas");
	const rows = [];
	let url = `${ORIGIN}${path}`;
	for (let page = 0; url && page < 10; page += 1) {
		const result = await request(url, {
			label: LABEL,
			allowlist: ALLOW,
			headers: { cookie, accept: "application/json" }
		});
		const chunk = parseJson(result.text, LABEL);
		if (Array.isArray(chunk)) rows.push(...chunk);
		const link = result.headers?.get("link") ?? "";
		const next = link.match(/<([^>]+)>\s*;\s*rel="next"/);
		url = next ? next[1] : null;
	}
	return rows;
}

export async function courses(doc) {
	const rows = await listAll("/api/v1/courses?enrollment_state=active&enrollment_type=student&per_page=100", doc);
	return rows
		.filter((row) => row && !row.access_restricted_by_date)
		.map((row) => ({
			id: row.id,
			name: row.name ?? row.course_code ?? "",
			code: row.course_code ?? "",
			term: row.term?.name ?? "",
			teachers: (row.teachers ?? []).map((t) => t.display_name).filter(Boolean)
		}));
}

export async function assignments(doc, courseId) {
	const id = Number(courseId);
	if (!Number.isInteger(id) || id <= 0) {
		throw new CampusError("INVALID_ARGUMENT", `课程 ID 不合法：${courseId}`);
	}
	const rows = await listAll(`/api/v1/courses/${id}/assignments?per_page=100&order_by=due_at`, doc);
	return rows.map((row) => ({
		id: row.id,
		courseId: id,
		title: row.name ?? "",
		dueAt: row.due_at ?? null,
		points: row.points_possible ?? null,
		submitted: Boolean(row.has_submitted_submissions),
		htmlUrl: row.html_url ?? ""
	}));
}

export async function upcoming(doc, days = 7) {
	const span = Number(days);
	const limit = Number.isFinite(span) && span > 0 && span <= 120 ? span : 7;
	const now = Date.now();
	const until = now + limit * 24 * 60 * 60 * 1000;
	const list = await courses(doc);
	const out = [];
	for (const course of list) {
		let rows;
		try {
			rows = await assignments(doc, course.id);
		} catch (error) {
			// 单门课挂了不该让整次查询失败。
			if (error?.code === "LOGIN_REQUIRED") throw error;
			continue;
		}
		for (const row of rows) {
			if (!row.dueAt) continue;
			const at = Date.parse(row.dueAt);
			if (!Number.isFinite(at) || at < now || at > until) continue;
			out.push({ ...row, courseName: course.name });
		}
	}
	return out.sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
}

export { ORIGIN as CANVAS_ORIGIN, ALLOW as CANVAS_ALLOW };
