#!/usr/bin/env node
// 自检：不联网，只确认路径解析对了、技能脚本在、缓存能读。
// 装完之后先跑这个，比直接开面板更容易看出哪里没配对。
//   node scripts/smoke.mjs
import { existsSync, statSync } from "node:fs";
import { CACHE_FILE, CHROME, PLAYWRIGHT, SKILL, STATE_DIR, WORKSPACE } from "../lib/config.mjs";
import { SOURCES, readSettings, snapshot } from "../lib/panel.mjs";

let failed = false;

const ok = (label, value) => console.log(`  ✓ ${label}  ${value}`);
const bad = (label, hint) => {
	console.log(`  ✗ ${label}`);
	if (hint) console.log(`    ${hint}`);
	failed = true;
};

console.log("\n路径");
ok("工作区", WORKSPACE);
ok("状态目录", STATE_DIR);
existsSync(STATE_DIR) ? ok("状态目录已创建", "") : bad("状态目录不存在", "第一次刷新数据时会自动创建，也可以现在 mkdir -p");
ok("缓存文件", existsSync(CACHE_FILE) ? CACHE_FILE : "（还没有，刷新一次后生成）");

console.log("\n外部依赖");
existsSync(SKILL)
	? ok("tongji-campus 技能", SKILL)
	: bad("找不到技能脚本", `设置 TONGJI_ONLINE_SKILL 指向 run.mjs（当前找的是 ${SKILL}）`);
existsSync(PLAYWRIGHT)
	? ok("Playwright", PLAYWRIGHT)
	: bad("找不到 playwright-core", "npm i playwright-core，或设置 TONGJI_ONLINE_PLAYWRIGHT");
existsSync(CHROME)
	? ok("Chrome", CHROME)
	: bad("找不到 Chrome", "装一个 Google Chrome，或设置 TONGJI_ONLINE_CHROME");

console.log("\n数据");
const snap = snapshot();
const settings = readSettings();
ok("来源", SOURCES.join(" / "));
for (const name of SOURCES) {
	const entry = snap.sources?.[name];
	if (!entry) {
		console.log(`  · ${name}  未刷新`);
		continue;
	}
	const items = Array.isArray(entry.items) ? entry.items.length : 0;
	// updatedAt 是按来源分开记的，不是整个快照一个时间。
	const when = snap.updatedAt?.[name] ? new Date(snap.updatedAt[name]).toLocaleString("zh-CN") : "—";
	console.log(`  · ${name}  ${entry.ok ? "ok" : "失败"}  ${items} 项  ${when}`);
	if (entry.note) console.log(`    ${entry.note}`);
	if (entry.error) console.log(`    ${entry.error}`);
}
ok("自动总结开关", settings.scheduledDigest === false ? "关闭" : "开启");
ok("定时跑哪些来源", (settings.scheduledSources ?? []).join(" / ") || "（未设置）");

if (existsSync(CACHE_FILE)) {
	const age = Date.now() - statSync(CACHE_FILE).mtimeMs;
	ok("缓存年龄", `${Math.round(age / 60000)} 分钟`);
}

console.log(failed ? "\n有项目没配好，见上面的提示。\n" : "\n都配好了。\n");
process.exit(failed ? 1 : 0);
