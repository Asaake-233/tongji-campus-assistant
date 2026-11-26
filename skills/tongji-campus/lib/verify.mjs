// 一次跑完所有能离线验证的断言。不碰网络的地方全在这里，改完代码先跑它。
import { CampusError } from "./errors.mjs";
import { parseWeeks, shapeTerm, shapeTimetable } from "./education.mjs";
import { assertPath } from "./http.mjs";
import { cookieHeader, readSession } from "./session.mjs";
import { SERVICES, SERVICE_NAMES } from "./login.mjs";
import { pickRooms, seatHeaders, shapeSeats } from "./seats.mjs";

const results = [];
const check = (name, fn) => {
	try {
		const detail = fn();
		results.push({ name, ok: true, detail: detail ?? "" });
	} catch (error) {
		results.push({ name, ok: false, detail: error?.message ?? String(error) });
	}
};

check("parseWeeks 数组", () => {
	const got = parseWeeks([1, 2]);
	if (String(got) !== "1,2") throw new Error(`得到 ${got}`);
});

check("parseWeeks 位串", () => {
	const got = parseWeeks("0110");
	if (String(got) !== "2,3") throw new Error(`得到 ${got}`);
});

check("parseWeeks 区间", () => {
	const got = parseWeeks("1-4");
	if (String(got) !== "1,2,3,4") throw new Error(`得到 ${got}`);
});

check("parseWeeks 逗号", () => {
	const got = parseWeeks("1,3,5");
	if (String(got) !== "1,3,5") throw new Error(`得到 ${got}`);
});

check("parseWeeks 空值", () => {
	if (parseWeeks(null).length !== 0) throw new Error("应为空");
});

check("白名单拦住越权路径", () => {
	let blocked = false;
	try {
		assertPath("https://canvas.tongji.edu.cn/api/v1/courses/1/../../admin", [{ path: /^\/api\/v1\/courses$/ }], "Canvas");
	} catch (error) {
		blocked = error instanceof CampusError && error.code === "INVALID_ARGUMENT";
	}
	if (!blocked) throw new Error("没有拦住");
});

check("白名单放行正常路径", () => {
	assertPath("https://canvas.tongji.edu.cn/api/v1/courses?per_page=10", [
		{ path: /^\/api\/v1\/courses$/, params: ["per_page", "page"] }
	], "Canvas");
});

check("白名单拦住多余查询参数", () => {
	let blocked = false;
	try {
		assertPath("https://canvas.tongji.edu.cn/api/v1/courses?evil=1", [
			{ path: /^\/api\/v1\/courses$/, params: ["per_page"] }
		], "Canvas");
	} catch (error) {
		blocked = error?.code === "INVALID_ARGUMENT";
	}
	if (!blocked) throw new Error("没有拦住");
});

check("cookieHeader 只取 tongji 域", () => {
	const doc = {
		cookies: [
			{ name: "a", value: "1", domain: ".tongji.edu.cn", path: "/" },
			{ name: "b", value: "2", domain: ".example.com", path: "/" }
		],
		origins: [],
		serviceData: {}
	};
	const header = cookieHeader(doc, "canvas.tongji.edu.cn");
	if (header.includes("b=")) throw new Error(`混进了外域 cookie：${header}`);
	if (!header.includes("a=1")) throw new Error("漏了本校 cookie");
});

check("站点表完整", () => {
	const expected = ["canvas", "education", "library", "card", "space"];
	const missing = expected.filter((name) => !SERVICE_NAMES.includes(name));
	if (missing.length) throw new Error(`缺站点：${missing.join(",")}`);
	for (const name of SERVICE_NAMES) {
		const spec = SERVICES[name];
		if (!spec.url || typeof spec.landed !== "function") throw new Error(`${name} 的配置不完整`);
	}
});

check("session.json 结构可读", () => {
	const doc = readSession();
	if (!Array.isArray(doc.cookies)) throw new Error("cookies 不是数组");
	if (!doc.serviceData || typeof doc.serviceData !== "object") throw new Error("serviceData 不是对象");
});

// 以下四项对应 2026-11-24 修掉的真实 bug。改动相关代码时别退回去 ——
// 这几个问题都不会报错，只会「查得到命令、拿不到数据」。
check("课表读 timeTableList 而不是外层", () => {
	const { lessons } = shapeTimetable([
		{
			courseName: "示例课程",
			teacherName: "示例教师",
			timeTableList: [{ dayOfWeek: 1, timeStart: 9, timeEnd: 11, weeks: [11, 12], roomLable: "示例校区" }]
		}
	]);
	if (lessons.length !== 1) throw new Error(`应展开成 1 条，得到 ${lessons.length}`);
	const row = lessons[0];
	if (row.weekday !== 1) throw new Error(`weekday 应为 1，得到 ${row.weekday}`);
	if (row.startUnit !== 9) throw new Error(`startUnit 应为 9，得到 ${row.startUnit}`);
	if (!row.weeks.includes(11)) throw new Error("weeks 应含第 11 周");
});

check("学期名取外层 simpleName", () => {
	const term = shapeTerm({ schoolCalendar: { id: 122, weekNum: 23 }, simpleName: "2026-2027学年度第1学期", week: 11 });
	if (term.id !== 122) throw new Error("id 应取 schoolCalendar.id");
	if (term.name !== "2026-2027学年度第1学期") throw new Error(`name 错了：${term.name}`);
	if (term.week !== 11) throw new Error(`week 错了：${term.week}`);
});

check("座位字段读 free_num/storeyName", () => {
	const out = shapeSeats([{ name: "六楼阅览区-北", storeyName: "六楼", free_num: 21, total_num: 48 }], "六楼");
	if (out.total !== 1) throw new Error(`应匹配 1 个房间，得到 ${out.total}`);
	if (out.free !== 21) throw new Error(`空位数应为 21，得到 ${out.free}`);
	if (out.rooms[0].floor !== "六楼") throw new Error("floor 应取 storeyName");
	if (pickRooms([{ name: "二楼北", storeyName: "二楼" }], "六楼").length !== 0) throw new Error("不该匹配二楼");
});

check("座位必须带 bearer token 头", () => {
	const headers = seatHeaders("abc123");
	if (headers.authorization !== "bearerabc123") {
		throw new Error(`头应为 bearerabc123（无空格），得到 ${headers.authorization}`);
	}
});

const failed = results.filter((row) => !row.ok);
process.stdout.write(`${JSON.stringify({ ok: failed.length === 0, passed: results.length - failed.length, failed: failed.length, results }, null, 2)}\n`);
process.exit(failed.length ? 1 : 0);
