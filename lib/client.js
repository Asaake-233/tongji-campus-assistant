window.__ModuleLoader__.load({
	id: "tongji-online-sidebar",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const h = React.createElement;

		const PANEL_ID = "tongji-online";
		const CSS_ID = "tongji-online-sidebar/panel.css";

		// 图标统一用 24×24 描边路径，颜色继承所在卡片，深浅色自动跟随主题。
		const ICONS = {
			clipboard: ["M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z", "M8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2", "M9 13l2 2 4-4"],
			layers: ["M12 3 3 8l9 5 9-5-9-5Z", "M3 13l9 5 9-5", "M3 17.5l9 5 9-5"],
			calendar: ["M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z", "M4 10h16", "M8 3v4", "M16 3v4"],
			chart: ["M4 20V10", "M10 20V4", "M16 20v-6", "M22 20H2"],
			donut: ["M12 3a9 9 0 1 0 9 9", "M12 3v9h9"],
			layout: ["M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z", "M3 10h18", "M10 21V10"],
			book: ["M5 4.5A2.5 2.5 0 0 1 7.5 2H19v18H7.5A2.5 2.5 0 0 0 5 22V4.5Z", "M9 7h6"],
			card: ["M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z", "M3 10h18", "M7 15h4"],
			receipt: ["M6 3h12v18l-3-2-3 2-3-2-3 2V3Z", "M9 8h6", "M9 12h6"],
			file: ["M14 3v5h5", "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z", "M9 13h6", "M9 17h4"],
			mail: ["M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z", "M3.5 7.5 12 13l8.5-5.5"],
			cloud: ["M7 18a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17.4 9.5 3.5 3.5 0 0 1 17.5 18H7Z"],
			bolt: ["M13 2 4 14h6l-1 8 9-12h-6l1-8Z"],
			wrench: ["M15.5 4.5a4.5 4.5 0 0 0-5.9 5.7L4 15.8 8.2 20l5.6-5.6a4.5 4.5 0 0 0 5.7-5.9l-2.9 2.9-2.4-2.4 2.9-2.9Z"],
			ticket: ["M4 9V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6Z", "M12 8v8"],
			search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M21 21l-4.3-4.3"],
			flask: ["M9 3h6", "M10 3v6L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9V3", "M7.5 14h9"],
			star: ["M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z"],
			video: ["M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z", "M16 10l5-3v10l-5-3"],
			filter: ["M3 5h18", "M6 12h12", "M10 19h4"],
			idcard: ["M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z", "M8.2 10.6a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z", "M5.6 16c.6-1.7 1.9-2.6 3.4-2.6s2.8.9 3.4 2.6", "M15 10h4", "M15 14h4"],
			trophy: ["M8 4h8v4a4 4 0 0 1-8 0V4Z", "M8 6H5v2a3 3 0 0 0 3 3", "M16 6h3v2a3 3 0 0 1-3 3", "M12 12v4", "M10 20h4", "M10 20v-2h4v2"],
			bulb: ["M9 18h6", "M10 21h4", "M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.1h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"],
			sigma: ["M18 4H6l6 8-6 8h12"],
			chat: ["M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V5Z", "M8 9h8", "M8 12.5h5"]
		};

		// 第一组：走 tongji-online 技能的查询卡，点击后把指令填进新会话。
		const QUERIES = [
			{ icon: "clipboard", title: "近期作业", hint: "未来 7 天到期的作业与提交状态", prompt: "使用 tongji-online 帮我看看未来七天截止的作业。" },
			{ icon: "layers", title: "课程列表", hint: "这学期在 Canvas 上的课程", prompt: "使用 tongji-online 列出我这学期在 Canvas 上的课程。" },
			{ icon: "calendar", title: "本周课表", hint: "按教学周读取本科课表", prompt: "使用 tongji-online 查一下我本周的课表。" },
			{ icon: "chart", title: "成绩查询", hint: "按学期或课程看成绩", prompt: "使用 tongji-online 查一下我最近一学期的成绩。" },
			{ icon: "donut", title: "学分缺口", hint: "对照培养计划看还差什么", prompt: "使用 tongji-online 分析我的培养计划学分缺口。" },
			{ icon: "layout", title: "图书馆空位", hint: "嘉定六楼当前空闲座位", prompt: "使用 tongji-online 查一下嘉定图书馆六楼现在有多少空位。" },
			{ icon: "book", title: "我的借阅", hint: "在借书目与应还日期", prompt: "使用 tongji-online 查一下我现在的借阅和应还日期。" },
			{ icon: "card", title: "一卡通余额", hint: "校园卡账户当前余额", prompt: "使用 tongji-online 查一下我的一卡通余额。" },
			{ icon: "receipt", title: "消费流水", hint: "按月汇总消费与充值", prompt: "使用 tongji-online 看一下我这个月的一卡通消费流水。" },
			{ icon: "file", title: "电子成绩单", hint: "官方文件目录与获取入口", prompt: "使用 tongji-online 帮我找一下官方电子成绩单的获取入口。" }
		];

		// 后面几组：外链入口卡，点击用系统浏览器打开。
		const SECTIONS = [
			{
				id: "teaching",
				title: "教学与课程",
				note: "在浏览器中打开",
				items: [
					{ icon: "layout", title: "1系统", hint: "教学一体化：选课、成绩、培养计划", url: "https://1.tongji.edu.cn" },
					{ icon: "video", title: "智慧教学媒体", hint: "看录课与课件（look）", url: "https://look.tongji.edu.cn" },
					{ icon: "flask", title: "物理实验教学中心", hint: "大物实验选课、讲义与成绩", url: "https://mphylab.tongji.edu.cn/page/home/index" },
					{ icon: "flask", title: "ilab 虚拟实验", hint: "虚拟实验平台", url: "https://www.ilab-x.com/" },
					{ icon: "book", title: "学习通", hint: "超星：课程资料、作业、签到", url: "https://i.chaoxing.com/base?ws=1" },
					{ icon: "video", title: "中国大学 MOOC", hint: "icourse163：慕课课程与测验", url: "https://www.icourse163.org/home.htm" },
					{ icon: "bulb", title: "智慧树", hint: "在线课程、见面课与作业", url: "https://hike-teaching-center.polymas.com/stu-hike/agent-course-hike/ai-course-center" }
				]
			},
			{
				id: "campus",
				title: "校园服务",
				note: "在浏览器中打开",
				items: [
					{ icon: "book", title: "图书馆", hint: "馆藏检索、数据库、座位预约", url: "https://www.lib.tongji.edu.cn" },
					{ icon: "calendar", title: "图书馆空间预约", hint: "研习室、讨论间预约", url: "https://space.tongji.edu.cn/h5/#/home" },
					{ icon: "ticket", title: "体育场馆预约", hint: "羽毛球、乒乓球等场地", url: "https://stadium.tongji.edu.cn" },
					{ icon: "layers", title: "一网通办", hint: "奖学金、助学金、勤工助学", url: "https://myportal.tongji.edu.cn" },
					{ icon: "mail", title: "同济邮箱", hint: "教育邮箱网页版", url: "https://mail.tongji.edu.cn/" },
					{ icon: "cloud", title: "同济云盘", hint: "云盘服务", url: "https://yunpan.tongji.edu.cn/" },
					{ icon: "card", title: "财务处缴费", hint: "学费、住宿费及其他费用", url: "https://paycwc.tongji.edu.cn/payment/" },
					{ icon: "bolt", title: "宿舍购电", hint: "查电费余额、充值", url: "http://goudian.tongji.edu.cn/" },
					{ icon: "wrench", title: "后勤报修", hint: "报修、宽带、投诉", url: "https://tjhq.tongji.edu.cn" }
				]
			},
			{
				id: "academic",
				title: "学术资源",
				note: "在浏览器中打开",
				items: [
					{ icon: "search", title: "中国知网", hint: "中文期刊与学位论文", url: "https://www.cnki.net" },
					{ icon: "search", title: "Web of Science", hint: "英文引文数据库", url: "https://www.webofscience.com" },
					{ icon: "search", title: "万方数据", hint: "中文文献库", url: "https://www.wanfangdata.com.cn" },
					{ icon: "search", title: "Google Scholar", hint: "英文文献检索", url: "https://scholar.google.com" },
					{ icon: "search", title: "Semantic Scholar", hint: "AI 辅助论文检索", url: "https://www.semanticscholar.org" },
					{ icon: "sigma", title: "数学外卖", hint: "数院资料站：讲义、真题、经验", url: "https://tongjimath.github.io" }
				]
			},
			{
				id: "career",
				title: "升学与就业",
				note: "在浏览器中打开",
				items: [
					{ icon: "idcard", title: "学信网", hint: "学籍学历查询、在线验证报告", url: "https://www.chsi.com.cn" },
					{ icon: "trophy", title: "职业规划大赛", hint: "全国大学生职业规划大赛报名", url: "https://zgs.chsi.com.cn/center/enterprise/signup" },
					{ icon: "bulb", title: "创新创业平台", hint: "SITP 项目申报与管理", url: "https://cxcy.tongji.edu.cn/pt/System/Home/Index" }
				]
			},
			{
				id: "course",
				title: "选课与规划",
				note: "第三方站点，请勿在此输入统一认证密码",
				items: [
					{ icon: "star", title: "YOURTJ 选课社区", hint: "匿名选课评价", url: "https://xk.yourtj.de/" },
					{ icon: "chat", title: "YourTJ 论坛", hint: "选课、课程、校园话题讨论", url: "https://f.yourtj.de" },
					{ icon: "filter", title: "通济 选课系统", hint: "课程筛选工具", url: "https://course.f1justin.com/" },
					{ icon: "calendar", title: "同济排课助手", hint: "模拟选课流程", url: "https://xk.xialing.icu/" }
				]
			}
		];

		const GROUPS = [{ id: "query", title: "查询", note: "填指令到新会话，回车执行", items: QUERIES, kind: "query" }].concat(
			SECTIONS.map((section) => ({ id: section.id, title: section.title, note: section.note, items: section.items, kind: "link" }))
		);

		const DATA_SOURCES = [
			{ id: "canvas", icon: "clipboard", title: "Canvas 作业", hint: "近期截止与提交状态" },
			{ id: "education", icon: "layers", title: "1系统公告", hint: "通知与教学安排" },
			{ id: "chaoxing", icon: "book", title: "学习通通知", hint: "作业、考试、学习任务" },
			{ id: "mooc", icon: "video", title: "MOOC 课程", hint: "SPOC 进度与学期结束" },
			{ id: "zhihuishu", icon: "bulb", title: "智慧树待办", hint: "待完成任务与截止时间" }
		];

		// 自动总结开关的唯一真相源。面板里的开关和注入到原生「自动化任务」行上的开关
		// 读写同一份状态，谁改了都立刻同步给另一边。
		const settingsStore = {
			value: { scheduledDigest: true, scheduledSources: ["canvas", "education"] },
			loaded: false,
			listeners: new Set(),
			subscribe(listener) {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			},
			set(next) {
				if (!next || typeof next !== "object") return;
				this.loaded = true;
				this.value = { ...this.value, ...next };
				for (const listener of this.listeners) {
					try {
						listener(this.value);
					} catch {}
				}
			}
		};

		async function ensureSettings() {
			if (settingsStore.loaded) return settingsStore.value;
			try {
				const response = await fetch("/tongji/data", { headers: { accept: "application/json" } });
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const snapshot = await response.json();
				settingsStore.set(snapshot?.settings);
			} catch {}
			return settingsStore.value;
		}

		async function saveSettings(patch) {
			const response = await fetch("/tongji/settings", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(patch)
			});
			// 405 = 宿主还是旧版本（新路由没注册），重启一次应用就能存。
			if (response.status === 405) throw new Error("需要重启一次应用才能保存开关");
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const snapshot = await response.json();
			settingsStore.set(snapshot?.settings);
			return snapshot;
		}

		// 原生「自动化任务」页没有行级插槽（整个页面 renderSlot 出现 0 次），任务行是写死的
		// <li><button>，所以只能用 DOM 注入：把开关挂在 li 上、绝对定位到右侧，不塞进 button
		// 里（按钮套按钮点不动）。类名是 CSS Modules 哈希（CxUija_*），只能靠结构和 aria-label 认。
		const SCHEDULE_TASK_TITLE = "同济校园助手待办摘要";

		function mountNativeSwitch() {
			if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
			ensureCss();
			ensureLensFilter();

			const controls = new Set();
			let stopped = false;
			let frame = 0;

			const paint = (control) => {
				const on = settingsStore.value.scheduledDigest !== false;
				control.dataset.on = on ? "true" : "false";
				control.setAttribute("aria-checked", on ? "true" : "false");
				control.title = on ? "点击关闭自动总结" : "点击开启自动总结";
			};

			const syncAll = () => {
				for (const control of controls) paint(control);
			};

			const toggle = async (control) => {
				if (control.disabled) return;
				const next = settingsStore.value.scheduledDigest === false;
				control.disabled = true;
				try {
					await saveSettings({ scheduledDigest: next });
					control.dataset.error = "false";
				} catch (error) {
					control.dataset.error = "true";
					control.title = `保存失败：${error?.message ?? error}`;
					// 报错状态留 2 秒再恢复成正常提示，别让红点一直挂着。
					setTimeout(() => {
						control.dataset.error = "false";
						paint(control);
					}, 2000);
				} finally {
					control.disabled = false;
					if (control.dataset.error !== "true") paint(control);
				}
			};

			// 垂直方向对齐标题那一行，而不是整个两行高的行（左边图标就是跟标题行对齐的）。
			// 优先量标题元素的盒中心：它随字号设置一起变，写死像素会错位。
			// 拿不到标题就退回图标中心；两者都量不到（jsdom 里 rect 全是 0）就用 CSS 的兜底值。
			const align = (control, row) => {
				const inner = row.querySelector(":scope > button");
				if (!inner) return;
				const content = inner.lastElementChild;
				const anchor = content?.firstElementChild ?? inner.firstElementChild;
				if (!anchor) return;
				const rowBox = row.getBoundingClientRect();
				const anchorBox = anchor.getBoundingClientRect();
				if (!rowBox.height || !anchorBox.height) return;
				const top = anchorBox.top - rowBox.top + anchorBox.height / 2;
				control.style.top = `${Math.round(top * 2) / 2}px`;
			};

			const decorate = (row) => {
				if (row.querySelector(":scope > .to-tj-native-switch")) return;
				row.dataset.tjRow = "1";
				const control = document.createElement("button");
				control.type = "button";
				control.className = "to-tj-switch to-tj-native-switch";
				control.setAttribute("role", "switch");
				control.setAttribute("aria-label", "每天 21:00 自动总结");
				// 整行是原生 button，点开关不能顺带打开详情面板。
				control.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					void toggle(control);
				});
				control.addEventListener("keydown", (event) => event.stopPropagation());
				controls.add(control);
				paint(control);
				row.appendChild(control);
				align(control, row);
			};

			const scan = () => {
				if (stopped) return;
				for (const button of document.querySelectorAll("li > button[aria-expanded][aria-label]")) {
					const label = button.getAttribute("aria-label") ?? "";
					if (!label.includes(SCHEDULE_TASK_TITLE)) continue;
					const row = button.parentElement;
					if (row) decorate(row);
				}
				// 行被 React 重渲染掉时开关节点会一起消失，Set 里留着的引用顺手清掉。
				for (const control of controls) {
					if (!control.isConnected) controls.delete(control);
				}
			};

			const schedule = () => {
				if (stopped || frame) return;
				frame = requestAnimationFrame(() => {
					frame = 0;
					scan();
				});
			};

			// 整个 body 都在观察范围里，聊天流式输出会不停增删文本节点。这些跟任务列表无关，
			// 先按节点类型筛掉，只在真的动到列表结构时才安排一次扫描。
			const relevant = (record) => {
				for (const node of [...record.addedNodes, ...record.removedNodes]) {
					if (node.nodeType !== 1) continue;
					if (node.tagName === "LI" || node.tagName === "UL" || node.tagName === "BUTTON") return true;
					if (node.querySelector?.("ul,li")) return true;
				}
				return false;
			};

			const observer = new MutationObserver((records) => {
				if (records.some(relevant)) schedule();
			});
			observer.observe(document.body, { childList: true, subtree: true });

			// 字号设置、窗口宽度变化都会让标题行高变，重新量一遍。
			const realign = () => {
				for (const control of controls) {
					const row = control.parentElement;
					if (row?.dataset.tjRow) align(control, row);
				}
			};
			window.addEventListener("resize", realign);

			const unsubscribe = settingsStore.subscribe(syncAll);
			void ensureSettings().then(syncAll);
			scan();

			return () => {
				stopped = true;
				if (frame) cancelAnimationFrame(frame);
				observer.disconnect();
				window.removeEventListener("resize", realign);
				unsubscribe();
				for (const control of controls) control.remove();
				controls.clear();
			};
		}

		// 尺寸全部由 DSH 主题变量推导，跟随字号设置与深浅色；毛玻璃用 backdrop-filter 叠在柔光背景上。
		const css = `
.to-tj-page{
  --tj-text:var(--dsh-content-font-size,14px);
  box-sizing:border-box;height:100%;overflow:auto;
  padding:0 clamp(20px,3.4vw,48px) 56px;
  font-family:var(--dsw-font-family,inherit);
  color:var(--dsw-alias-label-primary,#1a1a1a);
  background:
    radial-gradient(1100px 520px at 8% -8%, color-mix(in srgb, #4d93f8 14%, transparent), transparent 62%),
    radial-gradient(900px 460px at 96% -4%, color-mix(in srgb, #8f7bff 12%, transparent), transparent 58%),
    linear-gradient(180deg, #f2f5fa 0%, #f8fafc 46%, var(--dsw-alias-bg-base,#fff) 100%);
}
.to-tj-head{max-width:1000px;margin:0 auto;padding:clamp(24px,3.2vw,44px) 0 18px}
.to-tj-eyebrow{
  margin:0 0 10px;font-size:calc(var(--tj-text) - 1.5px);font-weight:600;letter-spacing:.09em;
  text-transform:uppercase;color:var(--dsw-alias-label-tertiary,#8a8a8a)
}
.to-tj-title{
  margin:0 0 10px;font-size:calc(var(--tj-text) + 14px);line-height:1.25;font-weight:650;letter-spacing:-.02em
}
.to-tj-sub{
  margin:0;max-width:64ch;font-size:calc(var(--tj-text) + 1.5px);line-height:1.75;
  color:var(--dsw-alias-label-secondary,#5f5f5f)
}
.to-tj-searchwrap{
  position:sticky;top:0;z-index:3;max-width:1000px;margin:0 auto 22px;padding:12px 0;
  background:var(--dsw-alias-bg-base,#fff);
  box-shadow:0 1px 0 color-mix(in srgb, var(--dsw-alias-border-l2,#0000001a) 100%, transparent)
}
.to-tj-search{position:relative}
.to-tj-search input{
  box-sizing:border-box;width:100%;height:46px;padding:0 96px 0 42px;
  border-radius:14px;font:inherit;font-size:calc(var(--tj-text) + 1px);
  color:var(--dsw-alias-label-primary,#1a1a1a);
  background:color-mix(in srgb, var(--dsw-alias-bg-layer-2,#fff) 88%, transparent);
  border:1px solid color-mix(in srgb, var(--dsw-alias-border-l3,#0000001f) 85%, transparent);
  box-shadow:var(--dsw-shadow-lv1,0 2px 4px #0000000d), inset 0 1px 0 color-mix(in srgb, #fff 45%, transparent);
  outline:none;transition:border-color .16s ease,box-shadow .16s ease
}
.to-tj-search input::placeholder{color:var(--dsw-alias-label-tertiary,#8a8a8a)}
.to-tj-search input:focus{
  border-color:color-mix(in srgb, #4d93f8 55%, transparent);
  box-shadow:0 0 0 3px color-mix(in srgb, #4d93f8 18%, transparent)
}
.to-tj-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--dsw-alias-label-tertiary,#8a8a8a);pointer-events:none}
.to-tj-search-meta{
  position:absolute;right:12px;top:50%;transform:translateY(-50%);
  display:flex;align-items:center;gap:8px;font-size:calc(var(--tj-text) - 1.5px);
  color:var(--dsw-alias-label-tertiary,#8a8a8a)
}
.to-tj-clear{
  display:grid;place-items:center;width:22px;height:22px;padding:0;border:none;cursor:pointer;
  border-radius:50%;color:var(--dsw-alias-label-secondary,#5f5f5f);
  background:color-mix(in srgb, var(--dsw-alias-label-primary,#111) 9%, transparent)
}
.to-tj-clear:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary,#111) 15%, transparent)}
.to-tj-empty{
  max-width:1000px;margin:30px auto;padding:36px 24px;text-align:center;
  border-radius:var(--dsw-radius-lg,16px);font-size:calc(var(--tj-text) + 1px);
  color:var(--dsw-alias-label-secondary,#5f5f5f);
  border:1px dashed color-mix(in srgb, var(--dsw-alias-border-l3,#0000001f) 90%, transparent)
}
.to-tj-data-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.to-tj-data{
  box-sizing:border-box;display:flex;flex-direction:column;gap:10px;
  padding:16px 18px;border-radius:var(--dsw-radius-lg,16px);
  background:linear-gradient(158deg,
    color-mix(in srgb, var(--dsw-alias-bg-layer-2,#fff) 88%, transparent),
    color-mix(in srgb, var(--dsw-alias-bg-layer-1,#fff) 58%, transparent));
  border:1px solid color-mix(in srgb, var(--dsw-alias-border-l3,#0000001f) 85%, transparent);
  box-shadow:var(--dsw-shadow-lv1,0 2px 6px #0000000a), inset 0 1px 0 color-mix(in srgb, #fff 52%, transparent);
  -webkit-backdrop-filter:blur(30px) saturate(180%);backdrop-filter:blur(30px) saturate(180%)
}
.to-tj-data-head{display:flex;align-items:center;gap:10px}
.to-tj-data-title{min-width:0;flex:1}
.to-tj-data-title .to-tj-card-title{margin:0;font-size:calc(var(--tj-text) + 1.5px);font-weight:640}
.to-tj-data-title .to-tj-card-hint{margin:2px 0 0;font-size:calc(var(--tj-text) - 1px);line-height:1.5}
.to-tj-refresh{
  flex:none;cursor:pointer;border-radius:999px;padding:5px 12px;
  font:inherit;font-size:calc(var(--tj-text) - 1.5px);font-weight:560;
  color:var(--dsw-alias-label-secondary,#5f5f5f);
  background:color-mix(in srgb, var(--dsw-alias-label-primary,#111) 6%, transparent);
  border:1px solid color-mix(in srgb, var(--dsw-alias-border-l3,#0000001f) 80%, transparent);
  transition:background .16s ease,color .16s ease
}
.to-tj-refresh:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary,#111) 11%, transparent);color:var(--dsw-alias-label-primary,#1a1a1a)}
.to-tj-refresh:disabled{opacity:.55;cursor:default}
.to-tj-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.to-tj-list-item{display:flex;align-items:flex-start;gap:8px}
.to-tj-list-dot{flex:none;width:5px;height:5px;margin-top:7px;border-radius:50%;background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4d93f8) 70%, transparent)}
.to-tj-list-main{min-width:0;flex:1}
.to-tj-list-title{margin:0;font-size:calc(var(--tj-text) + .5px);line-height:1.5;overflow-wrap:anywhere}
.to-tj-list-meta{margin:1px 0 0;font-size:calc(var(--tj-text) - 1.5px);line-height:1.5;color:var(--dsw-alias-label-tertiary,#8a8a8a);overflow-wrap:anywhere}
.to-tj-list-open{flex:none;margin-top:2px;color:var(--dsw-alias-label-tertiary,#8a8a8a);text-decoration:none;opacity:.7}
.to-tj-list-open:hover{opacity:1;color:var(--dsw-alias-label-primary,#1a1a1a)}
.to-tj-data-note{margin:0;font-size:calc(var(--tj-text) - 1.5px);line-height:1.55;color:var(--dsw-alias-label-tertiary,#8a8a8a)}
.to-tj-more{align-self:flex-start;margin:0;padding:3px 0;border:0;background:none;cursor:pointer;font:inherit;font-size:calc(var(--tj-text) - 1.5px);line-height:1.5;color:var(--dsw-alias-label-secondary,#666);text-decoration:underline;text-decoration-color:color-mix(in srgb,currentColor 32%,transparent);text-underline-offset:2.5px;transition:color .16s ease}
.to-tj-more:hover{color:var(--dsw-alias-label-primary,#1a1a1a)}
.to-tj-data-error{margin:0;font-size:calc(var(--tj-text) - 1.5px);line-height:1.55;color:var(--dsw-alias-state-error-primary,#d33)}
.to-tj-data-empty{margin:0;font-size:calc(var(--tj-text) - 1.5px);line-height:1.6;color:var(--dsw-alias-label-tertiary,#8a8a8a)}
.to-tj-data-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px}
.to-tj-switchrow{display:flex;align-items:center;gap:9px;margin-left:auto;flex:none}
.to-tj-switchlabel{margin:0;font-size:calc(var(--tj-text) - 1.5px);line-height:1.5;color:var(--dsw-alias-label-tertiary,#8a8a8a);text-align:right}
/* 液态玻璃开关（对齐 iOS 26 那颗）。
   关键不是"白色圆球 + 阴影"，而是滑块本身是一块透镜：
   backdrop-filter 引用 SVG 的 feDisplacementMap，把背后的轨道颜色按球面法线弯折，
   再加一点色散（R/G/B 三个位移量）和边缘镜面高光。所以开态下能看见蓝色透过滑块、
   且靠近边缘被压缩——这是玻璃，不是塑料。 */
.to-tj-switch{
  --tj-sw-w:44px;--tj-sw-h:26px;--tj-sw-pad:2px;
  --tj-sw-knob:calc(var(--tj-sw-h) - var(--tj-sw-pad) * 2);
  --tj-sw-travel:calc(var(--tj-sw-w) - var(--tj-sw-knob) - var(--tj-sw-pad) * 2);
  position:relative;flex:none;width:var(--tj-sw-w);height:var(--tj-sw-h);padding:0;
  cursor:pointer;border-radius:999px;
  /* 不用 1px solid：实线边在 22px 下会显出"贴纸"的硬边，改用 inset 阴影收边。 */
  border:0;
  background:color-mix(in srgb, #8e8e93 26%, transparent);
  backdrop-filter:blur(16px) saturate(190%);
  -webkit-backdrop-filter:blur(16px) saturate(190%);
  box-shadow:
    inset 0 0 0 .5px color-mix(in srgb, #000 5.5%, transparent),
    inset 0 1px 2.5px color-mix(in srgb, #000 9.5%, transparent),
    inset 0 -1px 0 color-mix(in srgb, #fff 48%, transparent),
    0 1px 2px color-mix(in srgb, #000 5.5%, transparent);
  transition:background .38s cubic-bezier(.32,.72,0,1),box-shadow .38s ease;
  -webkit-tap-highlight-color:transparent
}
/* 轨道上那层斜向高光，单独用 ::before 叠，避免和滑块抢 ::after。 */
.to-tj-switch::before{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:
    radial-gradient(140% 120% at 18% -30%, color-mix(in srgb, #fff 78%, transparent) 0%, transparent 58%),
    linear-gradient(180deg, color-mix(in srgb, #fff 26%, transparent) 0%, transparent 52%);
  opacity:.9;transition:opacity .38s ease
}
.to-tj-switch[data-on="true"]{
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--dsw-alias-brand-primary,#4d93f8) 62%, #fff) 0%,
      var(--dsw-alias-brand-primary,#4d93f8) 58%,
      color-mix(in srgb, var(--dsw-alias-brand-primary,#4d93f8) 86%, #000) 100%);
  box-shadow:
    inset 0 0 0 .5px color-mix(in srgb, #000 5%, transparent),
    inset 0 1px 2px color-mix(in srgb, #fff 34%, transparent),
    inset 0 -1px 2px color-mix(in srgb, #000 12%, transparent),
    0 1px 3px color-mix(in srgb, var(--dsw-alias-brand-primary,#4d93f8) 20%, transparent)
}
.to-tj-switch[data-on="true"]::before{opacity:.55}
/* 滑块：球面渐变 + 折射滤镜。刻意不用 1px 白描边——22px 下那圈实线会显得像贴纸；
   球感靠两层径向渐变（顶部弧形镜面光 + 左上到右下的明暗过渡）和柔和的 inset 阴影做出来。 */
.to-tj-switch::after{
  content:"";position:absolute;top:var(--tj-sw-pad);left:var(--tj-sw-pad);
  width:var(--tj-sw-knob);height:var(--tj-sw-knob);border-radius:50%;
  background:
    /* 顶部那道弧形镜面高光，只覆盖上沿一小块 */
    radial-gradient(56% 44% at 50% 3%, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 74%),
    /* 球面本体：左上亮、右下暗，边缘自然收口 */
    radial-gradient(74% 74% at 34% 25%, rgba(255,255,255,.97) 0%, rgba(255,255,255,.70) 40%, rgba(255,255,255,.40) 70%, rgba(255,255,255,.28) 90%, rgba(255,255,255,.24) 100%);
  backdrop-filter:blur(1.2px) url(#tongji-glass-lens) saturate(160%);
  -webkit-backdrop-filter:blur(1.2px) url(#tongji-glass-lens) saturate(160%);
  box-shadow:
    inset 0 1.5px 3px rgba(255,255,255,.72),
    inset 0 -2px 5px rgba(0,0,0,.09),
    0 1px 2.5px rgba(0,0,0,.15),
    0 3px 9px rgba(0,0,0,.09);
  transition:transform .42s cubic-bezier(.34,1.32,.5,1),width .22s cubic-bezier(.34,1.32,.5,1);
  will-change:transform
}
.to-tj-switch[data-on="true"]::after{transform:translateX(var(--tj-sw-travel))}
/* 按住时滑块被拉长一点、松手弹回，这是 iOS 那颗开关的手感来源。 */
.to-tj-switch:active::after{width:calc(var(--tj-sw-knob) + 4px)}
.to-tj-switch[data-on="true"]:active::after{transform:translateX(calc(var(--tj-sw-travel) - 4px))}
.to-tj-switch:focus-visible{
  outline:2px solid color-mix(in srgb, var(--dsw-alias-brand-primary,#4d93f8) 72%, transparent);
  outline-offset:3px
}
.to-tj-switch:disabled{opacity:.5;cursor:default}
/* 深色下玻璃要更亮才看得见：轨道底色抬亮、高光减弱；滑块降一点不透明度让蓝色透出来。 */
body[data-ds-dark-theme] .to-tj-switch{
  border-color:transparent;
  background:color-mix(in srgb, #fff 15%, transparent);
  box-shadow:
    inset 0 0 0 .5px color-mix(in srgb, #fff 7%, transparent),
    inset 0 1px 2.5px color-mix(in srgb, #000 40%, transparent),
    inset 0 -1px 0 color-mix(in srgb, #fff 13%, transparent),
    0 1px 2px color-mix(in srgb, #000 35%, transparent)
}
body[data-ds-dark-theme] .to-tj-switch::before{
  background:
    radial-gradient(140% 120% at 18% -30%, color-mix(in srgb, #fff 34%, transparent) 0%, transparent 58%),
    linear-gradient(180deg, color-mix(in srgb, #fff 13%, transparent) 0%, transparent 52%)
}
body[data-ds-dark-theme] .to-tj-switch[data-on="true"]{
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--dsw-alias-brand-primary,#4d93f8) 58%, #fff) 0%,
      color-mix(in srgb, var(--dsw-alias-brand-primary,#4d93f8) 92%, #000) 62%,
      color-mix(in srgb, var(--dsw-alias-brand-primary,#4d93f8) 74%, #000) 100%);
  box-shadow:
    inset 0 0 0 .5px color-mix(in srgb, #fff 10%, transparent),
    inset 0 1px 2px color-mix(in srgb, #fff 26%, transparent),
    inset 0 -1px 2px color-mix(in srgb, #000 20%, transparent),
    0 1px 4px color-mix(in srgb, var(--dsw-alias-brand-primary,#4d93f8) 28%, transparent)
}
body[data-ds-dark-theme] .to-tj-switch::after{
  background:
    radial-gradient(56% 44% at 50% 3%, rgba(255,255,255,.72) 0%, rgba(255,255,255,0) 74%),
    radial-gradient(74% 74% at 34% 25%, rgba(255,255,255,.92) 0%, rgba(255,255,255,.60) 42%, rgba(255,255,255,.38) 72%, rgba(255,255,255,.30) 92%, rgba(255,255,255,.26) 100%);
  box-shadow:
    inset 0 1.5px 3px rgba(255,255,255,.55),
    inset 0 -2px 6px rgba(0,0,0,.28),
    0 1px 3px rgba(0,0,0,.45),
    0 3px 10px rgba(0,0,0,.30)
}
/* 注入到原生「自动化任务」行右侧的开关：外观复用 .to-tj-switch，只把定位换成绝对定位。
   放在 li 上而不是 button 里，避免按钮套按钮；行内容留出右侧空间，标题不会被压住。 */
li[data-tj-row]{position:relative}
li[data-tj-row] > button:not(.to-tj-switch){padding-right:64px}
/* 对齐：右边贴着行的 8px 内边距（原来 10px 差 2px）；
   垂直中心对着标题那一行，而不是整个两行高的行 —— 左边图标也是这么对的，
   标题行高 23px、行上内边距 8px，所以中心是 19.5px。单行行高时这个值和
   整行居中完全重合，两种行都对齐。 */
.to-tj-native-switch{position:absolute;top:19.5px;right:8px;transform:translateY(-50%);z-index:1}
.to-tj-native-switch[data-error="true"]{
  border-color:color-mix(in srgb, #e5484d 64%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, #fff 34%, transparent) 0%, transparent 58%),
    color-mix(in srgb, #e5484d 52%, transparent);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 50%, transparent),
    0 2px 8px color-mix(in srgb, #e5484d 40%, transparent)
}
.to-tj-section{max-width:1000px;margin:0 auto 30px}
.to-tj-section-head{display:flex;align-items:baseline;gap:10px;margin:0 0 14px;flex-wrap:wrap}
.to-tj-section-title{margin:0;font-size:calc(var(--tj-text) + 2.5px);font-weight:640;letter-spacing:-.01em}
.to-tj-section-note{margin:0;font-size:calc(var(--tj-text) - 1.5px);color:var(--dsw-alias-label-tertiary,#8a8a8a)}
.to-tj-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(272px,1fr))}
.to-tj-card{
  box-sizing:border-box;
  position:relative;display:flex;gap:14px;align-items:flex-start;width:100%;
  padding:20px 22px;border-radius:var(--dsw-radius-lg,16px);
  text-align:left;cursor:pointer;color:inherit;font:inherit;text-decoration:none;
  background:linear-gradient(158deg,
    color-mix(in srgb, var(--dsw-alias-bg-layer-2,#fff) 88%, transparent),
    color-mix(in srgb, var(--dsw-alias-bg-layer-1,#fff) 58%, transparent));
  border:1px solid color-mix(in srgb, var(--dsw-alias-border-l3,#0000001f) 85%, transparent);
  box-shadow:var(--dsw-shadow-lv2,0 4px 12px #0000000a), inset 0 1px 0 color-mix(in srgb, #fff 52%, transparent);
  -webkit-backdrop-filter:blur(30px) saturate(180%);
  backdrop-filter:blur(30px) saturate(180%);
  transition:transform .2s cubic-bezier(.22,.61,.36,1),box-shadow .2s ease,border-color .2s ease,background .2s ease
}
.to-tj-card:hover{
  transform:translateY(-2px);
  border-color:color-mix(in srgb, var(--dsw-alias-brand-primary,#111) 26%, transparent);
  box-shadow:var(--dsw-shadow-lv3,0 12px 32px #00000014), inset 0 1px 0 color-mix(in srgb, #fff 62%, transparent)
}
.to-tj-card:active{transform:translateY(0) scale(.996)}
.to-tj-card:focus-visible{outline:2px solid color-mix(in srgb, #4d93f8 70%, transparent);outline-offset:2px}
.to-tj-glyph{
  flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:12px;
  color:var(--dsw-alias-brand-primary,#111);
  background:color-mix(in srgb, var(--dsw-alias-brand-primary,#111) 8%, transparent);
  border:1px solid color-mix(in srgb, var(--dsw-alias-border-l4,#00000029) 70%, transparent)
}
.to-tj-body{min-width:0;flex:1}
.to-tj-card-title{
  margin:0 0 5px;font-size:calc(var(--tj-text) + 2.5px);font-weight:620;line-height:1.35;letter-spacing:-.01em
}
.to-tj-card-hint{
  margin:0;font-size:calc(var(--tj-text) + .5px);line-height:1.6;color:var(--dsw-alias-label-secondary,#5f5f5f)
}
.to-tj-arrow{
  flex:none;align-self:flex-start;margin-left:auto;margin-top:2px;
  opacity:0;transform:translateX(-3px);
  color:var(--dsw-alias-label-tertiary,#8a8a8a);transition:opacity .18s ease,transform .18s ease
}
.to-tj-card--query .to-tj-arrow{align-self:flex-end;margin-top:0}
.to-tj-card:hover .to-tj-arrow{opacity:1;transform:translateX(0)}
.to-tj-card--link .to-tj-arrow{opacity:.45;transform:none}
.to-tj-card--link:hover .to-tj-arrow{opacity:1}
.to-tj-foot{
  max-width:1000px;margin:8px auto 0;font-size:calc(var(--tj-text) - 1.5px);line-height:1.7;
  color:var(--dsw-alias-label-tertiary,#8a8a8a)
}
body[data-ds-dark-theme] .to-tj-page{
  background:
    radial-gradient(1100px 520px at 8% -8%, color-mix(in srgb, #4d93f8 18%, transparent), transparent 62%),
    radial-gradient(900px 460px at 96% -4%, color-mix(in srgb, #8f7bff 14%, transparent), transparent 58%),
    var(--dsw-alias-bg-base,#111)
}
body[data-ds-dark-theme] .to-tj-card{
  background:linear-gradient(158deg,
    color-mix(in srgb, var(--dsw-alias-bg-layer-2,#1c1c1e) 78%, transparent),
    color-mix(in srgb, var(--dsw-alias-bg-layer-1,#161618) 46%, transparent));
  box-shadow:var(--dsw-shadow-lv2,0 4px 12px #00000040), inset 0 1px 0 color-mix(in srgb, #fff 9%, transparent)
}
body[data-ds-dark-theme] .to-tj-card:hover{
  box-shadow:var(--dsw-shadow-lv3,0 12px 32px #00000060), inset 0 1px 0 color-mix(in srgb, #fff 14%, transparent)
}
body[data-ds-dark-theme] .to-tj-searchwrap{
  background:var(--dsw-alias-bg-base,#111)
}
body[data-ds-dark-theme] .to-tj-search input{
  box-shadow:var(--dsw-shadow-lv1,0 2px 4px #00000040), inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent)
}
@media (prefers-reduced-motion:reduce){
  .to-tj-card,.to-tj-arrow,.to-tj-search input{transition:none}
}
`;

		// 面板和注入的原生开关共用同一份样式表，所以插 CSS 的逻辑不能绑在 React 生命周期上。
		function ensureCss() {
			if (typeof document === "undefined") return;
			if (document.querySelector(`style[data-plugin-css="${CSS_ID}"]`)) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "tongji-online-sidebar";
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		function useCss() {
			React.useEffect(() => {
				ensureCss();
				ensureLensFilter();
			}, []);
		}

		// ---- 液态玻璃的折射滤镜 -------------------------------------------------
		// backdrop-filter 只能模糊，做不出透镜。真玻璃要把背后的像素按球面法线弯折，
		// 这只能靠 SVG 的 feDisplacementMap + backdrop-filter:url(#id)（Chromium 专有）。
		// 位移图运行时用 Canvas 画出来，不把 base64 硬编码进 bundle：
		//   lensMap —— 灰度法线图，R 通道管 x 位移、G 管 y 位移、128 是中性
		// Safari/Firefox 不支持 backdrop-filter:url()，会退化成 blur()，所以 blur 必须留着兜底。
		const LENS_FILTER_ID = "tongji-glass-lens";
		const LENS_MAP_SIZE = 96;

		// 凸透镜剖面：中心几乎不弯，越靠边折得越狠，最外圈回落 0 避免边缘撕裂。
		function lensMap(size, strength) {
			const SS = 4;
			const W = size * SS;
			const raw = document.createElement("canvas");
			raw.width = raw.height = W;
			const ctx = raw.getContext("2d");
			const img = ctx.createImageData(W, W);
			const mid = (W - 1) / 2;
			const radius = W / 2 - SS;
			for (let y = 0; y < W; y += 1) {
				for (let x = 0; x < W; x += 1) {
					const i = (y * W + x) * 4;
					const dx = (x - mid) / radius;
					const dy = (y - mid) / radius;
					const r = Math.hypot(dx, dy);
					let rr = 128;
					let gg = 128;
					if (r < 1) {
						// 剖面必须在 r=0.72 就归零。滑块只有 22px，内边距 2px，
						// 位移一旦超过 ~1px 边缘就会采到轨道外面的页面底色，
						// 那圈灰被提饱和后变成一条黄褐色脏痕。
						const edge = Math.max(0, (r - 0.72) / 0.28);
						const k = Math.pow(r, 3.2) * (1 - Math.pow(edge, 2));
						const ux = dx / (r || 1);
						const uy = dy / (r || 1);
						rr = 128 - ux * k * strength;
						gg = 128 - uy * k * strength;
					}
					img.data[i] = rr;
					img.data[i + 1] = gg;
					img.data[i + 2] = 128;
					img.data[i + 3] = 255;
				}
			}
			ctx.putImageData(img, 0, 0);
			const out = document.createElement("canvas");
			out.width = out.height = size;
			out.getContext("2d").drawImage(raw, 0, 0, size, size);
			return out.toDataURL();
		}

		// 高光和圆环全部交给 CSS 的 box-shadow。曾经试过在滤镜里用 specular 贴图
		// 做 feComposite + feBlend，但 22px 这个尺寸下位移会把贴图边缘搅成一条脏边，
		// 而且 box-shadow 本来就更准、更便宜。
		function ensureLensFilter() {
			if (typeof document === "undefined") return;
			if (document.getElementById(LENS_FILTER_ID)) return;
			let disp;
			try {
				disp = lensMap(LENS_MAP_SIZE, 150);
			} catch {
				// 没有 canvas（jsdom、极旧的内核）就退化成 CSS 里那个 blur()，开关照常能用。
				return;
			}
			const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			svg.setAttribute("aria-hidden", "true");
			svg.dataset.plugin = "tongji-online-sidebar";
			svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
			const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
			filter.setAttribute("id", LENS_FILTER_ID);
			// 位移会把边缘像素推出元素框，滤镜区域要放大，否则四周被切掉。
			filter.setAttribute("x", "-15%");
			filter.setAttribute("y", "-15%");
			filter.setAttribute("width", "130%");
			filter.setAttribute("height", "130%");
			filter.setAttribute("color-interpolation-filters", "sRGB");
			filter.innerHTML =
				'<feGaussianBlur in="SourceGraphic" stdDeviation="0.2" result="b"/>' +
				`<feImage href="${disp}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="dm"/>` +
				'<feDisplacementMap in="b" in2="dm" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
				'<feColorMatrix in="d" type="saturate" values="1.35"/>';
			svg.appendChild(filter);
			document.body.appendChild(svg);
		}

		function Glyph({ name, size }) {
			const px = size ?? 20;
			return h(
				"svg",
				{ width: px, height: px, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
				(ICONS[name] ?? ICONS.file).map((d, index) => h("path", { key: index, d }))
			);
		}

		function Chevron() {
			return h(
				"svg",
				{ width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
				h("path", { d: "M9 6l6 6-6 6" })
			);
		}

		function ExternalArrow() {
			return h(
				"svg",
				{ width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
				h("path", { d: "M14 4h6v6" }),
				h("path", { d: "M20 4l-9 9" }),
				h("path", { d: "M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" })
			);
		}

		function PanelIcon({ size }) {
			return h(
				"svg",
				{ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
				h("path", { d: "M12 3 2 8l10 5 10-5-10-5Z" }),
				h("path", { d: "M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" })
			);
		}

		function apply(ctx) {
			// 所有查询卡共用同一个专属会话：第一次点击时建一个，把 id 记在 localStorage，
			// 之后每次都切回这个会话，只替换它的输入框内容。
			//
			// 不用 startSession：它每次都会 connectBlank 开一个新会话（还会 reuse 掉一个空白会话），
			// 而且内部 beginNavigation 之后如果外部再调 selectPanel 会把整条流程 abort 掉。
			// 这里改用 openSession（同步 retain + selectPanel(null)，不经过 navigation）
			// 再直接往该会话的输入 shell 里 setDraft。
			const SESSION_KEY = "tongji-online-sidebar/session-id";
			const SESSION_TITLE = "同济校园助手";

			const readStoredSession = () => {
				try {
					return localStorage.getItem(SESSION_KEY) ?? "";
				} catch {
					return "";
				}
			};
			const storeSession = (id) => {
				try {
					localStorage.setItem(SESSION_KEY, id);
				} catch {
					/* 隐私模式下写不进去就退化成每次重建，不影响功能 */
				}
			};

			// 新会话必须落在某个 workspace 里，否则侧栏列表里看不见。
			// 按"该 workspace 内最新会话的 updatedAt"挑最近用过的那个（无会话时退回 createdAt）。
			const pickWorkspace = () => {
				const workspaces = ctx.get?.("workspaces") ?? ctx.workspaces;
				const items = workspaces?.list?.getSnapshot()?.items ?? [];
				if (items.length === 0) return undefined;
				const sessions = ctx.sessions?.list?.getSnapshot() ?? { byId: {} };
				let best;
				let bestAt = Number.NEGATIVE_INFINITY;
				for (const workspace of items) {
					let latest = Number.NEGATIVE_INFINITY;
					for (const id of workspace.sessionIds ?? []) {
						const summary = sessions.byId?.[id];
						if (summary) latest = Math.max(latest, summary.updatedAt ?? 0);
					}
					// 没有会话的 workspace 用最近变动时间兜底（updatedAt 比 createdAt 更贴近"刚用过"）
					if (latest === Number.NEGATIVE_INFINITY) latest = Date.parse(workspace.updatedAt ?? workspace.createdAt ?? "") || 0;
					if (best === undefined || latest > bestAt) {
						best = workspace;
						bestAt = latest;
					}
				}
				return best;
			};

			const createSession = async () => {
				const workspace = pickWorkspace();
				const id = await ctx.sessions.create(workspace ? { workspaceId: workspace.workspaceId } : {});
				storeSession(id);
				ctx.sessions.rename(id, SESSION_TITLE).catch(() => {
					/* 改名失败不影响使用，标题先空着 */
				});
				return id;
			};

			let pending;
			const ensureSession = async () => {
				const stored = readStoredSession();
				if (stored !== "") {
					const ids = ctx.sessions?.list?.getSnapshot()?.ids ?? [];
					if (ids.includes(stored)) {
						try {
							ctx.uiWorkspace.openSession(stored);
							return stored;
						} catch (error) {
							console.warn("tongji-online-sidebar: 打开既有会话失败，重建", error);
						}
					}
					// 会话被删掉或归档了，下面重建一个
				}
				if (pending !== undefined) return pending;
				pending = createSession().finally(() => {
					pending = undefined;
				});
				const id = await pending;
				ctx.uiWorkspace.openSession(id);
				return id;
			};

			const openPrompt = (prompt) => {
				void (async () => {
					try {
						const id = await ensureSession();
						const shell = ctx.conversation?.input?.shell?.(id);
						if (shell === undefined) throw new Error(`没有拿到会话 ${id} 的输入框`);
						shell.setDraft(prompt);
						try {
							// 会话可能还没挂载输入框，把草稿落盘，这样下次打开也还在
							shell.persistCurrentDraft();
						} catch {
							/* 持久化失败不影响本次填入 */
						}
						try {
							// 面板刚关掉时输入框可能还没挂载，拿不到编辑器就跳过聚焦
							shell.focus();
						} catch {
							/* 聚焦失败不影响草稿已经写入 */
						}
					} catch (error) {
						console.warn("tongji-online-sidebar:", error);
					}
				})();
			};

			function QueryCard({ item }) {
				return h(
					"button",
					{ type: "button", className: "to-tj-card to-tj-card--query", onClick: () => openPrompt(item.prompt) },
					h("span", { className: "to-tj-glyph" }, h(Glyph, { name: item.icon })),
					h(
						"span",
						{ className: "to-tj-body" },
						h("p", { className: "to-tj-card-title" }, item.title),
						h("p", { className: "to-tj-card-hint" }, item.hint)
					),
					h("span", { className: "to-tj-arrow" }, h(Chevron))
				);
			}

			function LinkCard({ item }) {
				return h(
					"a",
					{
						className: "to-tj-card to-tj-card--link",
						href: item.url,
						target: "_blank",
						rel: "noreferrer noopener",
						title: item.url
					},
					h("span", { className: "to-tj-glyph" }, h(Glyph, { name: item.icon })),
					h(
						"span",
						{ className: "to-tj-body" },
						h("p", { className: "to-tj-card-title" }, item.title),
						h("p", { className: "to-tj-card-hint" }, item.hint)
					),
					h("span", { className: "to-tj-arrow" }, h(ExternalArrow))
				);
			}

			function Section({ title, note, items, kind }) {
				const Card = kind === "link" ? LinkCard : QueryCard;
				return h(
					"section",
					{ className: "to-tj-section" },
					h(
						"div",
						{ className: "to-tj-section-head" },
						h("h2", { className: "to-tj-section-title" }, title),
						note ? h("p", { className: "to-tj-section-note" }, note) : null
					),
					h("div", { className: "to-tj-grid" }, items.map((item) => h(Card, { key: item.title, item })))
				);
			}

			function CloseIcon() {
				return h(
					"svg",
					{ width: 11, height: 11, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", "aria-hidden": "true" },
					h("path", { d: "M6 6l12 12" }),
					h("path", { d: "M18 6L6 18" })
				);
			}

			function formatClock(iso) {
				const at = Date.parse(iso ?? "");
				if (!Number.isFinite(at)) return "";
				const d = new Date(at);
				const pad = (n) => String(n).padStart(2, "0");
				return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
			}

			function formatDue(value) {
				const at = Date.parse(value ?? "");
				if (!Number.isFinite(at)) return "";
				const d = new Date(at);
				const pad = (n) => String(n).padStart(2, "0");
				return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
			}

			const LIST_PREVIEW = 5;

			function DataCard({ source, state, busy, onRefresh }) {
				const entry = state?.sources?.[source.id];
				const items = Array.isArray(entry?.items) ? entry.items : [];
				const updated = state?.updatedAt?.[source.id];
				// Canvas 一次能扫出十几项作业，只露 5 项会让人以为就这么多，给个展开。
				const [expanded, setExpanded] = React.useState(false);
				const shown = expanded ? items : items.slice(0, LIST_PREVIEW);
				const hidden = items.length - shown.length;
				return h(
					"article",
					{ className: "to-tj-data" },
					h(
						"div",
						{ className: "to-tj-data-head" },
						h("span", { className: "to-tj-glyph" }, h(Glyph, { name: source.icon })),
						h(
							"div",
							{ className: "to-tj-data-title" },
							h("p", { className: "to-tj-card-title" }, source.title),
							h("p", { className: "to-tj-card-hint" }, entry ? `${items.length} 项 · ${formatClock(updated) || "未更新"}` : source.hint)
						),
						h(
							"button",
							{
								type: "button",
								className: "to-tj-refresh",
								disabled: busy !== null,
								onClick: () => onRefresh(source.id)
							},
							busy === source.id ? "刷新中…" : "刷新"
						)
					),
					entry?.error ? h("p", { className: "to-tj-data-error" }, entry.error) : null,
					shown.length
						? h(
								"ul",
								{ className: "to-tj-list" },
								shown.map((row, index) =>
									h(
										"li",
										{ className: "to-tj-list-item", key: `${source.id}-${index}` },
										h("span", { className: "to-tj-list-dot" }),
										h(
											"div",
											{ className: "to-tj-list-main" },
											h("p", { className: "to-tj-list-title" }, row.title),
											h(
												"p",
												{ className: "to-tj-list-meta" },
												[row.meta, formatDue(row.due), row.extra].filter(Boolean).join(" · ")
											)
										),
										row.url
											? h(
													"a",
													{ className: "to-tj-list-open", href: row.url, target: "_blank", rel: "noreferrer noopener", title: "打开" },
													h(ExternalArrow)
												)
											: null
									)
								)
							)
						: null,
					entry && !entry.error && items.length === 0 ? h("p", { className: "to-tj-data-empty" }, "没有待办，干净。") : null,
					!entry ? h("p", { className: "to-tj-data-empty" }, "还没拉过数据，点右上角刷新。") : null,
					hidden > 0 || (expanded && items.length > LIST_PREVIEW)
						? h(
								"button",
								{
									type: "button",
									className: "to-tj-more",
									onClick: () => setExpanded((value) => !value)
								},
								expanded ? "收起" : `展开全部 ${items.length} 项`
							)
						: null,
					entry?.note ? h("p", { className: "to-tj-data-note" }, entry.note) : null
				);
			}

			function Page() {
				useCss();
				const [query, setQuery] = React.useState("");
				const inputRef = React.useRef(null);

				React.useEffect(() => {
					const onKeyDown = (event) => {
						const target = event.target;
						const tag = target && target.tagName;
						if (tag === "INPUT" || tag === "TEXTAREA" || (target && target.isContentEditable)) return;
						if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
							event.preventDefault();
							if (inputRef.current) inputRef.current.focus();
						}
					};
					window.addEventListener("keydown", onKeyDown);
					return () => window.removeEventListener("keydown", onKeyDown);
				}, []);

				const [data, setData] = React.useState(null);
				const [busy, setBusy] = React.useState(null);
				const [loadError, setLoadError] = React.useState("");

				const loadData = React.useCallback(async () => {
					try {
						const response = await fetch("/tongji/data", { headers: { accept: "application/json" } });
						if (!response.ok) throw new Error(`HTTP ${response.status}`);
						const snapshot = await response.json();
						setData(snapshot);
						settingsStore.set(snapshot?.settings);
						setLoadError("");
					} catch (error) {
						setLoadError(`读取缓存失败：${error?.message ?? error}`);
					}
				}, []);

				React.useEffect(() => {
					loadData();
				}, [loadData]);

				const refresh = React.useCallback(async (source) => {
					setBusy(source);
					try {
						const response = await fetch("/tongji/refresh", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ source })
						});
						if (!response.ok) throw new Error(`HTTP ${response.status}`);
						const snapshot = await response.json();
						setData(snapshot);
						settingsStore.set(snapshot?.settings);
						setLoadError("");
					} catch (error) {
						setLoadError(`刷新失败：${error?.message ?? error}`);
					} finally {
						setBusy(null);
					}
				}, []);

				// 开关写回宿主（settings.json），定时任务到点会先读它决定跑不跑。
				// 走 saveSettings 而不是裸 fetch：注入到原生任务行上的开关改的是同一份状态，
				// 谁改了都要立刻同步给另一边。
				const toggleScheduled = React.useCallback(async () => {
					const next = settingsStore.value.scheduledDigest === false;
					setBusy("settings");
					try {
						const snapshot = await saveSettings({ scheduledDigest: next });
						setData(snapshot);
						setLoadError("");
					} catch (error) {
						setLoadError(`保存开关失败：${error?.message ?? error}`);
					} finally {
						setBusy(null);
					}
				}, [setBusy]);

				// 面板开着的时候，原生任务行上的开关也可能被点。订阅同一份状态，
				// 两边任何一边改了，这边的标签和滑块立刻跟上。
				const [settings, setSettings] = React.useState(settingsStore.value);
				React.useEffect(() => settingsStore.subscribe(setSettings), []);

				const scheduledOn = settings.scheduledDigest !== false;
				const scheduledNames = (settings.scheduledSources ?? ["canvas", "education"])
					.map((id) => DATA_SOURCES.find((source) => source.id === id)?.title ?? id)
					.join(" + ");

				const keyword = query.trim().toLowerCase();
				const groups = GROUPS.map((group) => ({
					id: group.id,
					title: group.title,
					note: group.note,
					kind: group.kind,
					items: keyword
						? group.items.filter((item) => `${item.title} ${item.hint} ${group.title}`.toLowerCase().includes(keyword))
						: group.items
				})).filter((group) => group.items.length > 0);
				const total = groups.reduce((sum, group) => sum + group.items.length, 0);
				const allCount = GROUPS.reduce((sum, group) => sum + group.items.length, 0);

				return h(
					"div",
					{ className: "to-tj-page" },
					h(
						"header",
						{ className: "to-tj-head" },
						h("p", { className: "to-tj-eyebrow" }, "Tongji Online"),
						h("h1", { className: "to-tj-title" }, "同济校园助手"),
						h("p", { className: "to-tj-sub" }, "查询卡会把指令填进「同济校园助手」这个会话的输入框，回车执行；入口卡会用系统浏览器打开对应网站。")
					),
					h(
						"div",
						{ className: "to-tj-searchwrap" },
						h(
							"div",
							{ className: "to-tj-search" },
							h("span", { className: "to-tj-search-icon" }, h(Glyph, { name: "search", size: 17 })),
							h("input", {
								ref: inputRef,
								type: "text",
								value: query,
								placeholder: "搜索功能或站点，例如：成绩、图书馆、邮箱",
								"aria-label": "搜索功能或站点",
								onChange: (event) => setQuery(event.target.value),
								onKeyDown: (event) => {
									if (event.key === "Escape") setQuery("");
								}
							}),
							h(
								"div",
								{ className: "to-tj-search-meta" },
								h("span", null, keyword ? `${total} / ${allCount}` : `${allCount} 项`),
								keyword
									? h(
											"button",
											{ type: "button", className: "to-tj-clear", onClick: () => setQuery(""), title: "清除", "aria-label": "清除搜索" },
											h(CloseIcon)
										)
									: null
							)
						)
					),
					keyword
						? null
						: h(
								"section",
								{ className: "to-tj-section" },
								h(
									"div",
									{ className: "to-tj-section-head" },
									h("h2", { className: "to-tj-section-title" }, "待办与公告"),
									h("p", { className: "to-tj-section-note" }, "点刷新才拉取，数据缓存在本机"),
									h(
										"div",
										{ className: "to-tj-switchrow" },
										h(
											"p",
											{ className: "to-tj-switchlabel" },
											scheduledOn ? `每天 21:00 自动总结 ${scheduledNames}` : "自动总结已关闭"
										),
										h("button", {
											type: "button",
											className: "to-tj-switch",
											role: "switch",
											"aria-checked": scheduledOn ? "true" : "false",
											"aria-label": "每天 21:00 自动总结",
											title: scheduledOn ? "点击关闭自动总结" : "点击开启自动总结",
											"data-on": scheduledOn ? "true" : "false",
											disabled: busy === "settings",
											onClick: toggleScheduled
										})
									)
								),
								loadError ? h("p", { className: "to-tj-data-error" }, loadError) : null,
								h(
									"div",
									{ className: "to-tj-data-grid" },
									DATA_SOURCES.map((source) =>
										h(DataCard, { key: source.id, source, state: data, busy, onRefresh: refresh })
									)
								)
							),
					groups.map((group) => h(Section, { key: group.id, title: group.title, note: group.note, items: group.items, kind: group.kind })),
					groups.length === 0
						? h("p", { className: "to-tj-empty" }, `没有匹配「${query.trim()}」的条目，换个关键词试试。`)
						: null,
					h("p", { className: "to-tj-foot" }, "查询数据来自同济官网，登录态只保存在本机。入口链接整理自 tongji.icu 导航站，第三方站点请勿输入统一认证密码。按 / 可聚焦搜索框。")
				);
			}

			ctx.effect(
				() =>
					ctx.slots.inject("main", () =>
						ctx.slots.register({ name: "main", key: PANEL_ID, label: "同济校园助手" }, Page)
					),
				"tongji-online-sidebar: panel page"
			);
			ctx.effect(
				() =>
					ctx.slots.inject("sidebar.panellist", () =>
						ctx.slots.register({ name: "sidebar.panellist", id: PANEL_ID, order: 5, label: "同济校园助手" }, PanelIcon)
					),
				"tongji-online-sidebar: panel icon"
			);
			// 原生「自动化任务」页没有行级插槽，只能挂在 document.body 上盯 DOM 变化。
			// 只认「待办摘要」这一条，别的任务行不碰。
			ctx.effect(() => mountNativeSwitch(), "tongji-online-sidebar: native schedule switch");
		}

		exports.apply = apply;
		// sessions 用来建并定位那个专属会话，conversation 用来往它的输入框写草稿。
		// workspaces 只是用来挑一个落脚的目录，拿不到就退回不带 workspace 建会话，
		// 所以走 ctx.get 而不是 inject —— inject 缺一个服务整个面板都挂不上。
		exports.inject = ["slots", "uiWorkspace", "layout", "sessions", "conversation"];
		return module.exports;
	}
});
