#!/usr/bin/env node
// 定时摘要：刷新数据源，输出一份按紧急程度分好类的纯文本摘要。
// 用法：
//   node scripts/digest.mjs                        五个来源全跑（手动用）
//   node scripts/digest.mjs --scheduled            按侧栏里的开关决定跑不跑、跑哪些（定时任务用这个）
//   node scripts/digest.mjs --only canvas,education  临时指定来源
// 输出直接贴进聊天即可；刷新结果同时写回 panel-cache.json，侧栏下次打开就是新的。
import { SOURCES, readSettings, refreshSource } from "../lib/panel.mjs";

const DAY = 86400000;
const now = new Date();

const settings = readSettings();
const scheduled = process.argv.includes("--scheduled");

// 面板里的开关：关掉之后定时任务到点也只回一句跳过，不再抓取。
if (scheduled && settings.scheduledDigest === false) {
	console.log("自动总结已关闭（侧栏「待办与公告」里的开关），本次跳过。");
	process.exit(0);
}

const onlyArg = process.argv.find((arg) => arg.startsWith("--only=")) ?? (process.argv.includes("--only") ? `--only=${process.argv[process.argv.indexOf("--only") + 1] ?? ""}` : "");
const only = onlyArg
	? onlyArg
			.slice("--only=".length)
			.split(",")
			.map((name) => name.trim())
			.filter(Boolean)
	: [];
const wanted = only.length ? only : scheduled ? settings.scheduledSources : SOURCES;
const targets = SOURCES.filter((source) => wanted.includes(source));
if (!targets.length) {
	console.error(`--only 里没有可识别的来源：${wanted.join(",")}（可选 ${SOURCES.join(" / ")}）`);
	process.exit(2);
}

// 各来源的截止时间格式不统一，逐个兜。
function parseDue(raw) {
	if (!raw) return null;
	const text = String(raw).trim();
	let match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
	if (match) return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00+08:00`);
	match = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
	if (match) return new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]);
	match = text.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
	if (match) return new Date(+match[1], +match[2] - 1, +match[3], 23, 59);
	match = text.match(/^(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
	if (match) return new Date(now.getFullYear(), +match[1] - 1, +match[2], +match[3], +match[4]);
	return null;
}

function daysLeft(date) {
	if (!date) return null;
	return Math.ceil((date.getTime() - now.getTime()) / DAY);
}

function stamp(date) {
	if (!date) return "";
	const pad = (n) => String(n).padStart(2, "0");
	return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const LABEL = {
	canvas: "Canvas 作业",
	education: "1系统公告",
	chaoxing: "学习通通知",
	mooc: "MOOC 课程",
	zhihuishu: "智慧树待办"
};

// 单个来源最多等 3 分钟，超时就当失败继续下一个，别让一个卡住的站点拖垮整份摘要。
// 注意定时器必须清掉：留着会让 node 的 event loop 一直等到它触发，脚本明明跑完了还挂着不走。
function withTimeout(promise, ms, label) {
	let timer;
	const guard = new Promise((resolve) => {
		timer = setTimeout(() => resolve({ ok: false, error: label, items: [] }), ms);
	});
	return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

const results = {};
for (const source of targets) {
	results[source] = await withTimeout(
		refreshSource(source).catch((error) => ({ ok: false, error: error.message, items: [] })),
		180000,
		"刷新超时（3 分钟）"
	);
}

const buckets = { overdue: [], today: [], soon: [], week: [], later: [], undated: [] };
const notices = [];
const progress = [];

for (const source of targets) {
	const result = results[source];
	for (const item of result.items ?? []) {
		const due = parseDue(item.due);
		const left = daysLeft(due);
		const entry = { source, label: LABEL[source], title: item.title, meta: item.meta, extra: item.extra, due, left };
		if (source === "education" || source === "chaoxing") {
			notices.push(entry);
			continue;
		}
		if (source === "mooc") {
			progress.push(entry);
			continue;
		}
		if (!due) buckets.undated.push(entry);
		else if (left < 0) buckets.overdue.push(entry);
		else if (left === 0) buckets.today.push(entry);
		else if (left <= 3) buckets.soon.push(entry);
		else if (left <= 7) buckets.week.push(entry);
		else buckets.later.push(entry);
	}
}

const lines = [];
lines.push(`待办摘要 · ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${stamp(now).slice(6)}`);

const failed = targets.filter((s) => !results[s]?.ok);
lines.push(
	failed.length
		? `抓取失败：${failed.map((s) => `${LABEL[s]}（${results[s].error?.slice(0, 40)}）`).join("、")}`
		: `${targets.map((s) => LABEL[s]).join("、")} 都取到了`
);

// 同一门课、同一截止时间的一堆章节测试没必要逐条列，合并成一行。
function collapse(list) {
	const groups = new Map();
	for (const item of list) {
		const key = `${item.source}|${item.meta}|${item.due ? item.due.getTime() : 0}`;
		const bucket = groups.get(key) ?? { items: [] };
		bucket.items.push(item);
		groups.set(key, bucket);
	}
	const out = [];
	for (const { items } of groups.values()) {
		if (items.length >= 3) out.push({ grouped: true, count: items.length, sample: items[0] });
		else out.push(...items);
	}
	return out;
}

const section = (title, list, formatter) => {
	if (!list.length) return;
	lines.push("");
	lines.push(`## ${title}（${list.length}）`);
	for (const item of collapse(list)) {
		if (item.grouped) {
			const sample = item.sample;
			lines.push(`- ${sample.meta || sample.label}：${item.count} 项（${sample.title} 等，截止 ${stamp(sample.due)}）`);
		} else {
			lines.push(`- ${formatter(item)}`);
		}
	}
};

// Canvas 的 extra 里带着「已提交 / 待提交 · 还剩 N 小时」，摘要要能看出交没交，所以一并带上。
const fmt = (item) => {
	// extra 里已经有「还剩 N 天」就别补；已逾期的 left 是负数，补出来是「剩 -22 天」，也跳过。
	const hasLeft = String(item.extra ?? "").includes("剩");
	const skipLeft = item.left === null || item.left < 0 || hasLeft;
	const tail = [item.meta, item.extra, skipLeft ? "" : `剩 ${item.left} 天`].filter(Boolean).join(" · ");
	return `${item.title}｜${item.label}${tail ? `｜${tail}` : ""}`;
};

section("已逾期", buckets.overdue, fmt);
section("今天截止", buckets.today, fmt);
section("三天内", buckets.soon, fmt);
section("一周内", buckets.week, fmt);
section("一周以后", buckets.later, fmt);
section("没有截止时间", buckets.undated, fmt);

if (progress.length) {
	lines.push("");
	lines.push(`## 课程进度（${progress.length}）`);
	for (const item of progress) lines.push(`- ${item.title}｜${item.meta}${item.due ? `｜学期结束 ${stamp(item.due)}` : ""}`);
}

if (notices.length) {
	const recent = notices.filter((n) => !n.due || now.getTime() - n.due.getTime() < 7 * DAY);
	lines.push("");
	lines.push(`## 近一周通知（共 ${recent.length} 条，列前 8）`);
	for (const item of recent.slice(0, 8)) lines.push(`- ${item.title}｜${item.label}${item.meta ? `｜${item.meta}` : ""}${item.due ? `｜${stamp(item.due)}` : ""}`);
}

// 「需要动手」只算还没交的：Canvas 的已提交项虽然还没到截止时间，但不需要再做什么。
const pending = (list) => list.filter((item) => !String(item.extra ?? "").includes("已提交"));
const undatedPending = pending(buckets.undated).length;
const urgent = pending(buckets.overdue).length + pending(buckets.today).length + pending(buckets.soon).length;
const submitted = buckets.soon.length + buckets.today.length - pending(buckets.soon).length - pending(buckets.today).length;
lines.push("");
if (urgent) {
	lines.push(`需要动手：${urgent} 项（逾期 ${pending(buckets.overdue).length} / 今天 ${pending(buckets.today).length} / 三天内 ${pending(buckets.soon).length}）`);
	if (undatedPending) lines.push(`另外 ${undatedPending} 项没写截止时间，也别忘（见上面「没有截止时间」）`);
} else if (submitted) {
	lines.push(`三天内没有要交的东西（${submitted} 项已提交，等成绩即可）`);
	if (undatedPending) lines.push(`但还有 ${undatedPending} 项没写截止时间的作业没交`);
} else if (undatedPending) {
	lines.push(`三天内没有要交的东西，但有 ${undatedPending} 项没写截止时间的作业没交`);
} else {
	lines.push("三天内没有要交的东西");
}

console.log(lines.join("\n"));
