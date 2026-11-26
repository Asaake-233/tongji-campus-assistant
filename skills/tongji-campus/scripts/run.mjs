#!/usr/bin/env node
// 入口只做一件事：把参数交给 lib/cli.mjs，用退出码表示成败。
import { main } from "../lib/cli.mjs";

main().then(
	(code) => process.exit(code),
	(error) => {
		process.stdout.write(
			`${JSON.stringify({ ok: false, error: { code: "UNEXPECTED", message: String(error?.message ?? error), hint: "" } })}\n`
		);
		process.exit(1);
	}
);
