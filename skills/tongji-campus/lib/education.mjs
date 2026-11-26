// 1 系统：公告和课表。鉴权是 X-Token 头（sessionStorage 里的 sessionid），
// 不是 cookie —— 所以「cookie 还在」不代表能用，必须真打一次接口才知道。
import { cookieHeader, serviceData } from "./session.mjs";
import { CampusError } from "./errors.mjs";
import { parseJson, request } from "./http.mjs";

const ORIGIN = "https://1.tongji.edu.cn";
const LABEL = "1系统";

const ALLOW = [
	{ path: /^\/api\/sessionservice\/session\/getSessionUser$/, params: [] },
	{ path: /^\/api\/baseresservice\/schoolCalendar\/currentTermCalendar$/, params: ["flag"] },
	{ path: /^\/api\/electionservice\/reportManagement\/findStudentTimetab$/, params: ["calendarId"] },
	{ path: /^\/api\/commonservice\/commonMsgPublish\/findMyCommonMsgPublish$/, params: [] }
];

function headers(doc) {
	const token = serviceData(doc, "education")?.sessionId;
	if (!token) throw new CampusError("LOGIN_REQUIRED", "1系统没有登录态", "运行 auth login --service education");
	const row = {
		"X-Token": token,
		accept: "application/json",
		"accept-language": "zh-CN,zh;q=0.9",
		"x-requested-with": "XMLHttpRequest"
	};
	const cookie = cookieHeader(doc, "1.tongji.edu.cn");
	if (cookie) row.cookie = cookie;
	return row;
}

async function get(path, doc) {
	const result = await request(`${ORIGIN}${path}`, { label: LABEL, allowlist: ALLOW, headers: headers(doc) });
	const payload = parseJson(result.text, LABEL);
	if (payload && typeof payload === "object" && "code" in payload && payload.code !== 200 && payload.code !== 0) {
		throw new CampusError("SERVICE_UNAVAILABLE", `${LABEL}返回 code=${payload.code}：${payload.msg ?? payload.message ?? ""}`);
	}
	return payload?.data ?? payload;
}

export async function verify(doc) {
	if (!serviceData(doc, "education")?.sessionId) return { authenticated: false, reason: "没有 1系统 sessionId" };
	const data = await get("/api/sessionservice/session/getSessionUser", doc);
	return {
		authenticated: Boolean(data),
		user: data ? { name: data.name ?? data.userName ?? "", id: data.id ?? data.userId ?? "" } : null
	};
}

export async function notices(doc, { limit = 30 } = {}) {
	const size = Number(limit);
	const capped = Number.isFinite(size) ? Math.min(Math.max(Math.trunc(size), 1), 50) : 30;
	const result = await request(`${ORIGIN}/api/commonservice/commonMsgPublish/findMyCommonMsgPublish`, {
		label: LABEL,
		allowlist: ALLOW,
		method: "POST",
		headers: { ...headers(doc), "content-type": "application/json" },
		body: { pageNum_: 1, pageSize_: capped }
	});
	const payload = parseJson(result.text, LABEL);
	const list = payload?.data?.list ?? payload?.data?.records ?? payload?.list ?? [];
	return list.map((row) => ({
		title: row.title ?? row.msgTitle ?? "",
		publishedAt: row.publishTime ?? row.createTime ?? "",
		publisher: row.publishName ?? row.publisher ?? "",
		url: row.url ?? row.linkUrl ?? ""
	}));
}

// 学期名不在 schoolCalendar 里，在外层的 simpleName（"2026-2027学年度第1学期"）。
// schoolCalendar 只有 id/year/term/beginDay/weekNum 这些数字。
export function shapeTerm(data) {
	const calendar = data?.schoolCalendar ?? data ?? {};
	return {
		id: calendar.id ?? calendar.calendarId ?? null,
		name: data?.simpleName ?? calendar.name ?? calendar.calendarName ?? "",
		startDate: calendar.beginDay ? new Date(calendar.beginDay).toISOString().slice(0, 10) : "",
		endDate: calendar.endDay ? new Date(calendar.endDay).toISOString().slice(0, 10) : "",
		week: Number(data?.week) || null,
		totalWeeks: Number(calendar.weekNum) || null
	};
}

export async function currentTerm(doc) {
	const data = await get("/api/baseresservice/schoolCalendar/currentTermCalendar?flag=0", doc);
	return shapeTerm(data);
}

// weeks 字段在不同学期有四种写法，全都要认，否则课表会整片空白。
export function parseWeeks(value) {
	if (value === null || value === undefined) return [];
	if (Array.isArray(value)) return value.flatMap((row) => parseWeeks(row));
	if (typeof value === "number") return Number.isFinite(value) ? [value] : [];
	const text = String(value).trim();
	if (!text) return [];
	// 位串必须先判，否则 `0110` 会被当成「第 110 周」。
	// 判断依据：全由 0/1 组成且长度 ≥3 —— 一学期没有第 110 周，
	// 而两位以内（"10"、"12"）显然是周次数字。
	if (/^[01]{3,}$/.test(text)) {
		return [...text].map((flag, index) => (flag === "1" ? index + 1 : 0)).filter(Boolean);
	}
	if (/^[\d,，\s-]+$/.test(text)) {
		const out = [];
		for (const piece of text.split(/[,，\s]+/).filter(Boolean)) {
			const range = piece.match(/^(\d+)\s*[-~]\s*(\d+)$/);
			if (range) {
				const from = Number(range[1]);
				const to = Number(range[2]);
				for (let i = from; i <= to && i - from < 60; i += 1) out.push(i);
			} else if (/^\d+$/.test(piece)) out.push(Number(piece));
		}
		return out;
	}
	// 短的全 0/1 串（如 "0110"）按「位串」理解更符合直觉：第 2、3 周有课。
	if (/^[01]+$/.test(text)) {
		return [...text].map((flag, index) => (flag === "1" ? index + 1 : 0)).filter(Boolean);
	}
	return [];
}

// 课程是外层，排课在 timeTableList[] 里：一门课可能一周上两次、单双周不同教室。
// 只读外层会拿到一堆 dayOfWeek=null 的空壳 —— 这是最容易踩的坑。
export function shapeTimetable(rows) {
	const lessons = [];
	for (const row of rows ?? []) {
		const slots = Array.isArray(row.timeTableList) && row.timeTableList.length ? row.timeTableList : [row];
		for (const slot of slots) {
			lessons.push({
				course: row.courseName ?? row.name ?? "",
				code: row.courseCode ?? "",
				teacher: slot.teacherName?.replace(/\(\d+\)$/, "") || row.teacherName || "",
				place: slot.roomLable || slot.campusI18n || row.classRoomName || row.campusName || "",
				weekday: Number(slot.dayOfWeek ?? slot.weekDay ?? row.weekDay ?? 0) || null,
				startUnit: Number(slot.timeStart ?? slot.startUnit ?? 0) || null,
				endUnit: Number(slot.timeEnd ?? slot.endUnit ?? 0) || null,
				weeks: parseWeeks(slot.weeks ?? slot.weekNum ?? row.weeks ?? row.weekStr),
				note: row.remark ?? "",
				text: slot.timeTab ?? row.classTime ?? ""
			});
		}
	}
	return { lessons };
}

export async function timetable(doc, { week = null, weekday = null } = {}) {
	const term = await currentTerm(doc);
	if (!term.id) throw new CampusError("PAGE_CHANGED", "拿不到当前学期 ID", "接口可能改版了");
	const data = await get(`/api/electionservice/reportManagement/findStudentTimetab?calendarId=${term.id}`, doc);
	const rows = Array.isArray(data) ? data : (data?.list ?? data?.timetableList ?? []);
	const wantWeek = Number(week);
	const wantDay = Number(weekday);
	const lessons = shapeTimetable(rows).lessons;
	const filtered = lessons.filter((row) => {
		if (Number.isFinite(wantWeek) && wantWeek > 0 && !row.weeks.includes(wantWeek)) return false;
		if (Number.isFinite(wantDay) && wantDay > 0 && row.weekday !== wantDay) return false;
		return true;
	});
	return { term, lessons: filtered };
}

export { ORIGIN as EDUCATION_ORIGIN };
