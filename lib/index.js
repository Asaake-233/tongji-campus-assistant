// 宿主侧：注册面板数据路由 + 留一行加载记录。
// 面板本身仍然全在 ./client 里，这里只提供「刷新 / 读取缓存 / 读写开关」三个接口。
import { appendFileSync } from "node:fs";
import { json, readBody, refreshSource, snapshot, writeSettings, SOURCES } from "./panel.mjs";

function log(message) {
	try {
		appendFileSync(new URL("../loaded.log", import.meta.url), `${new Date().toISOString()} ${message}\n`);
	} catch {}
}

export function apply(ctx) {
	log("loaded");
	ctx.inject(["webServer"], (host) => {
		host.effect(
			() =>
				host.webServer.register({
					path: "/tongji/data",
					handler: (request, response) => {
						if (request.method !== "GET") {
							response.writeHead(405, { allow: "GET" });
							response.end();
							return;
						}
						json(response, 200, snapshot());
					}
				}),
			"tongji-online-sidebar: data route"
		);
		host.effect(
			() =>
				host.webServer.register({
					path: "/tongji/refresh",
					handler: async (request, response) => {
						if (request.method !== "POST") {
							response.writeHead(405, { allow: "POST" });
							response.end();
							return;
						}
						const raw = await readBody(request);
						let source = "all";
						try {
							source = JSON.parse(raw || "{}")?.source ?? "all";
						} catch {
							source = "all";
						}
						const targets = source === "all" ? SOURCES : [source];
						for (const target of targets) {
							await refreshSource(target);
						}
						json(response, 200, snapshot());
					}
				}),
			"tongji-online-sidebar: refresh route"
		);
		// 面板上的开关：自动总结开/关、自动总结跑哪些来源。
		host.effect(
			() =>
				host.webServer.register({
					path: "/tongji/settings",
					handler: async (request, response) => {
						if (request.method !== "POST") {
							response.writeHead(405, { allow: "POST" });
							response.end();
							return;
						}
						const raw = await readBody(request);
						let patch = null;
						try {
							patch = JSON.parse(raw || "{}");
						} catch {
							json(response, 400, { error: "请求体不是合法 JSON" });
							return;
						}
						try {
							writeSettings(patch);
						} catch (error) {
							json(response, 500, { error: String(error?.message ?? error).slice(0, 200) });
							return;
						}
						json(response, 200, snapshot());
					}
				}),
			"tongji-online-sidebar: settings route"
		);
	});
}
