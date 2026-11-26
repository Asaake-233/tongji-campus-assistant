// 命令行入口。约定必须稳定，插件是照着它写的：
//   成功 → {"ok":true,"data":...}
//   失败 → {"ok":false,"error":{"code","message","hint"}}
// 只往 stdout 打一行 JSON，日志一律走 stderr —— 插件会 JSON.parse(stdout)。
import { CampusError } from "./errors.mjs";
import { readSession, clearSession } from "./session.mjs";
import { withLockAsync } from "./lock.mjs";
import * as canvas from "./canvas.mjs";
import * as library from "./library.mjs";
import * as education from "./education.mjs";
import { SERVICE_NAMES, login, verify } from "./login.mjs";
import { balance, transactions } from "./card.mjs";
import { free as freeSeats, SEAT_CAMPUS } from "./seats.mjs";

// 参数解析：只支持 --key value 和 --flag 两种，够用且没有歧义。
function parseArgs(argv) {
	const out = {};
	for (let i = 0; i < argv.length; i += 1) {
		const token = argv[i];
		if (!token.startsWith("--")) continue;
		const key = token.slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith("--")) {
			out[key] = true;
		} else {
			out[key] = next;
			i += 1;
		}
	}
	return out;
}

const number = (value, fallback) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const HELP = {
	usage: "node scripts/run.mjs <命令> [--参数 值 ...]",
	commands: {
		"auth login": "登录。--service canvas|library|education|card|space|all（默认 canvas），--timeout 秒",
		"auth status": "查看登录态。--service 同上；不传则全部检查",
		"auth logout": "清掉本地登录态",
		"canvas courses": "本学期在 Canvas 上的课程",
		"canvas assignments": "某门课的作业。--course <id>",
		"canvas upcoming": "未来若干天到期的作业。--days 7",
		"library search": "馆藏检索。--query 词 --field keyword|title|author|isbn --page 1 --limit 10",
		"library item": "书目详情。--id <recordId>",
		"library holdings": "馆藏单册与在架状态。--id <recordId>",
		"library loans": "我的借阅与应还日期（需登录）",
		"education notices": "1 系统公告。--limit 30",
		"education timetable": "本科课表。--week 周次 --weekday 1-7",
		"card balance": "一卡通余额",
		"card transactions": "一卡通消费流水（最近一页）",
		"seats free": "空闲座位。--campus 嘉定|四平|沪西|沪北 --floor 六楼 --category normal|research|exam",
		doctor: "自检：依赖、状态目录、各站点登录态",
		help: "显示这份说明"
	}
};

async function dispatch(command, args, log) {
	switch (command) {
		case "help":
			return HELP;
		case "auth login": {
			const service = typeof args.service === "string" ? args.service : "canvas";
			return withLockAsync(() => login({ service, timeout: number(args.timeout, undefined) }, { log }));
		}
		case "auth status": {
			const doc = readSession();
			const wanted = typeof args.service === "string" ? [args.service] : SERVICE_NAMES;
			const out = {};
			for (const name of wanted) {
				if (!SERVICE_NAMES.includes(name)) {
					out[name] = { authenticated: false, reason: "不认识的站点" };
					continue;
				}
				if (name === "card" || name === "space") {
					out[name] = { authenticated: null, reason: "这个站点只能在用时才知道，auth status 不探测" };
					continue;
				}
				try {
					out[name] = await verify(doc, name);
				} catch (error) {
					out[name] = { authenticated: false, reason: error?.message ?? String(error), code: error?.code ?? "" };
				}
			}
			return { stateFile: "session.json", services: out };
		}
		case "auth logout":
			clearSession();
			return { cleared: true };
		case "canvas courses":
			return { courses: await canvas.courses(readSession()) };
		case "canvas assignments":
			return { assignments: await canvas.assignments(readSession(), args.course) };
		case "canvas upcoming":
			return { days: number(args.days, 7), assignments: await canvas.upcoming(readSession(), number(args.days, 7)) };
		case "library search":
			return library.search(readSession(), {
				query: args.query,
				field: typeof args.field === "string" ? args.field : "keyword",
				page: number(args.page, 1),
				limit: number(args.limit, 10)
			});
		case "library item":
			return library.item(readSession(), args.id);
		case "library holdings":
			return { holdings: await library.holdings(readSession(), args.id) };
		case "library loans":
			return { loans: await library.loans(readSession()) };
		case "education notices":
			return { notices: await education.notices(readSession(), { limit: number(args.limit, 30) }) };
		case "education timetable":
			return education.timetable(readSession(), {
				week: args.week === undefined ? null : number(args.week, null),
				weekday: args.weekday === undefined ? null : number(args.weekday, null)
			});
		case "card balance":
			return balance();
		case "card transactions":
			return transactions({ month: typeof args.month === "string" ? args.month : null });
		case "seats free":
			return freeSeats({
				campus: typeof args.campus === "string" ? args.campus : "嘉定",
				floor: typeof args.floor === "string" ? args.floor : null,
				category: typeof args.category === "string" ? args.category : "normal",
				date: typeof args.date === "string" ? args.date : null
			});
		case "doctor":
			return doctor();
		default:
			throw new CampusError("INVALID_ARGUMENT", `不认识的命令：${command}`, "运行 help 看可用命令");
	}
}

async function doctor() {
	const { existsSync } = await import("node:fs");
	const { STATE_DIR, SESSION_FILE, CHROME, playwrightEntry } = await import("./env.mjs");
	const entry = playwrightEntry();
	const doc = readSession();
	const checks = [
		{ name: "node", ok: true, detail: process.version },
		{ name: "Chrome", ok: existsSync(CHROME), detail: CHROME },
		{ name: "playwright-core", ok: existsSync(entry), detail: entry },
		{ name: "状态目录", ok: existsSync(STATE_DIR), detail: STATE_DIR },
		{ name: "登录态文件", ok: existsSync(SESSION_FILE), detail: existsSync(SESSION_FILE) ? "已存在" : "还没有，先 auth login" },
		{ name: "cookie 数", ok: (doc.cookies ?? []).length > 0, detail: String((doc.cookies ?? []).length) }
	];
	return { checks, ok: checks.every((row) => row.ok) };
}

export async function main(argv = process.argv.slice(2)) {
	const log = (line) => process.stderr.write(`${line}\n`);
	// 前两个非 -- 开头的词构成命令名（auth login / canvas upcoming ...）。
	const words = [];
	const rest = [];
	for (let i = 0; i < argv.length; i += 1) {
		if (argv[i].startsWith("--")) {
			rest.push(...argv.slice(i));
			break;
		}
		words.push(argv[i]);
	}
	const command = words.slice(0, 2).join(" ");
	const args = parseArgs(rest);
	if (!command) {
		process.stdout.write(`${JSON.stringify({ ok: true, data: HELP })}\n`);
		return 0;
	}
	try {
		const data = await dispatch(command, args, log);
		process.stdout.write(`${JSON.stringify({ ok: true, data })}\n`);
		return 0;
	} catch (error) {
		const payload =
			error instanceof CampusError
				? { code: error.code, message: error.message, hint: error.hint }
				: { code: "UNEXPECTED", message: error?.message ?? String(error), hint: "" };
		process.stdout.write(`${JSON.stringify({ ok: false, error: payload })}\n`);
		return 1;
	}
}
