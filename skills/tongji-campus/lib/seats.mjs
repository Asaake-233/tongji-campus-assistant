// 图书馆座位：h5 站点用 sessionStorage.token 鉴权，接口是站内的 /reserve/index/*。
// 直接调接口拿不到 token（它在 sessionStorage 里），所以还是开一次浏览器，
// 但只发两个 fetch，不点任何按钮 —— 比一卡通那种点按钮的流程稳。
import { CampusError } from "./errors.mjs";
import { absorb, openPage, pageFetch, withBrowser } from "./browser.mjs";

const HOME = "https://space.tongji.edu.cn/h5/#/home";
const LABEL = "座位预约";

// 校区 ID 不是 1/2/3/4 那种顺序号，是数据库主键（嘉定 1、沪西 19、四平 27、沪北 72…）。
// 写死会指到不存在的楼，所以运行时先拉 /reserve/index/index 按名字匹配，这里的表只当兜底。
const CAMPUS_FALLBACK = { 嘉定: 1, 沪西: 19, 四平: 27, 沪北: 72 };
const CATEGORY = { normal: ["1"], research: ["3"], exam: ["4"], all: ["1", "3", "4"] };
const CATEGORY_LABEL = { normal: "普通座位", research: "研学室", exam: "考试座位", all: "全部" };

// 把「嘉定」这类简称对上「嘉定校区图书馆」。用户不会写全称。
function matchPremises(premises, campus) {
	const want = String(campus).trim();
	const exact = premises.find((row) => String(row.name ?? "").trim() === want);
	if (exact) return exact.id;
	const loose = premises.find((row) => String(row.name ?? "").includes(want));
	return loose ? loose.id : null;
}

function today() {
	const now = new Date();
	const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
	return local.toISOString().slice(0, 10);
}

async function reserveApi(page, path, body, token) {
	const result = await pageFetch(page, {
		url: `https://space.tongji.edu.cn${path}`,
		method: "POST",
		headers: seatHeaders(token),
		body
	});
	if (result.status === 401 || result.status === 403) {
		throw new CampusError("LOGIN_REQUIRED", "座位预约需要先登录", "运行 auth login --service space 打开登录窗口");
	}
	if (result.status !== 200) {
		throw new CampusError("SERVICE_UNAVAILABLE", `${LABEL}返回 HTTP ${result.status}`);
	}
	try {
		return JSON.parse(result.text);
	} catch {
		throw new CampusError("PAGE_CHANGED", `${LABEL}返回的不是 JSON`);
	}
}

// 楼层在 storeyName（"二楼"、"六楼"），房间名在 name（"六楼阅览区-北"）。
// 只匹配 premisesName 会拿到「嘉定校区图书馆」这种楼栋名，永远对不上楼层。
export function pickRooms(rows, want) {
	const needle = want ? String(want).trim() : "";
	if (!needle) return rows ?? [];
	return (rows ?? []).filter((row) => {
		const haystack = [row.storeyName, row.name, row.roomName, row.nameMerge].filter(Boolean).join(" ");
		return haystack.includes(needle);
	});
}

// 站点的写法是 "bearer" 直接拼 token，中间没有空格。
// 少了这个头接口照样返回 200，但列表是空的 —— 不报错，只是查不到。
export function seatHeaders(token) {
	return {
		"content-type": "application/json",
		accept: "application/json",
		authorization: `bearer${token}`
	};
}

// 汇总一个校区的空位。字段是 free_num / total_num，不是 surplus / total。
export function shapeSeats(rows, floor) {
	const matched = pickRooms(rows, floor);
	return {
		total: matched.length,
		free: matched.reduce((sum, row) => sum + (Number(row.free_num ?? row.surplus ?? row.free ?? 0) || 0), 0),
		seats: matched.reduce((sum, row) => sum + (Number(row.total_num ?? row.total ?? 0) || 0), 0),
		rooms: matched.map((row) => ({
			name: row.name ?? row.roomName ?? "",
			floor: row.storeyName ?? "",
			free: Number(row.free_num ?? row.surplus ?? row.free ?? 0) || 0,
			total: Number(row.total_num ?? row.total ?? row.count ?? 0) || null
		}))
	};
}

export async function free({ campus = "嘉定", floor = null, category = "normal", date = null } = {}) {
	const key = String(category).trim();
	if (!CATEGORY[key]) {
		throw new CampusError("INVALID_ARGUMENT", `不认识的座位类型：${category}`, `可选：${Object.keys(CATEGORY).join("、")}`);
	}
	const categoryIds = CATEGORY[key];
	const day = date ?? today();

	return withBrowser(async (context) => {
		const page = await openPage(context, HOME);
		// 单页应用要把 token 写进 sessionStorage 才肯放行，等它落定。
		await page.waitForTimeout(3500);

		const token = await page.evaluate(() => sessionStorage.getItem("token") ?? "").catch(() => "");
		if (!token) {
			throw new CampusError(
				"LOGIN_REQUIRED",
				"座位预约没有登录态",
				"运行 auth login --service space 打开登录窗口扫码；也可以在浏览器里先打开 " + HOME
			);
		}

		// 先拿真实的楼栋列表，按名字定 ID。
		const index = await reserveApi(page, "/reserve/index/index", { id: 1 }, token);
		const premises = index?.data?.premises ?? [];
		const premisesId = matchPremises(premises, campus) ?? CAMPUS_FALLBACK[String(campus).trim()];
		if (!premisesId) {
			const names = premises.map((row) => row.name).filter(Boolean).slice(0, 12).join("、");
			throw new CampusError("INVALID_ARGUMENT", `找不到校区：${campus}`, `站点上的楼栋有：${names}`);
		}

		const query = (ids) =>
			reserveApi(
				page,
				"/reserve/index/list",
				{ id: 1, date: day, categoryIds: ids, premisesIds: [premisesId], size: 100, page: 1 },
				token
			);
		let list = await query(categoryIds);
		// 大多数楼栋的房间都挂在 type 1 下，按「研学室」筛会得到空列表。
		// 空的时候退回全部类型，别让用户以为今天一个座位都没有。
		if (!(list?.data?.list ?? []).length && categoryIds.length < 3) {
			list = await query(CATEGORY.all);
		}

		const rows = list?.data?.list ?? list?.data?.records ?? list?.list ?? [];
		await absorb(context).catch(() => {});
		return {
			campus,
			floor: floor ?? null,
			category: CATEGORY_LABEL[category] ?? CATEGORY_LABEL.normal,
			date: day,
			...shapeSeats(rows, floor)
		};
	});
}

export { CAMPUS_FALLBACK as SEAT_CAMPUS };
