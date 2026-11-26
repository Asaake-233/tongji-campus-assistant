---
name: tongji-campus
description: 查询同济大学 Canvas 课程与作业、图书馆馆藏检索与本人借阅、1 系统公告与本科课表、一卡通余额与消费流水、图书馆座位与研习室空位；学校统一认证在用户本机浏览器里完成，需要登录时打开可见窗口扫码。也用于定位官方电子成绩单、一网通办、体育场馆预约等校内入口。
---

# 同济校园（tongji-campus）

一个只读的校园信息查询工具。所有命令都从技能目录运行：

```sh
node scripts/run.mjs <命令> [--参数 值 ...]
```

在别处调用时用绝对路径，或直接用 `./tj.sh <命令>`（它会把状态目录固定到插件用的那一份）。

输出永远是**一行 JSON**：

```json
{"ok": true, "data": ...}
{"ok": false, "error": {"code": "...", "message": "...", "hint": "..."}}
```

日志走 stderr，stdout 只有那一行 JSON —— 这样调用方可以直接 `JSON.parse`。

## 先做什么

不确定环境是否就绪就跑 `doctor`：它会检查 Node 版本、Chrome 路径、`playwright-core`、状态目录和登录态文件。缺依赖时在技能目录运行 `npm ci --ignore-scripts`。

## 登录

统一认证（iam.tongji.edu.cn）是唯一入口，一次扫码对所有站点生效。

```sh
node scripts/run.mjs auth login --service all      # 一次把五个站点都过一遍
node scripts/run.mjs auth login --service canvas   # 只登录某个站点
node scripts/run.mjs auth status                   # 看现在还能用哪些
node scripts/run.mjs auth logout                   # 清掉本地登录态
```

`auth login` 会先**静默探测**：cookie 还有效就直接返回，不开窗口。只有真的过期了才弹出可见的 Chrome 窗口等你扫码，扫完自动收起。`--timeout` 控制等多久（秒，默认 300）。

**给调用方（插件）的注意**：`--timeout` 是整条命令的总预算，技能会在它到期前自己退出。如果你的外层超时比它短，进程会被 SIGKILL 掉、留下孤儿 Chrome —— 所以外层超时要留至少 20 秒余量（插件里 canvas 用 `--timeout 150` / 180 秒，education 用 `--timeout 100` / 120 秒）。

站点名：`canvas`、`library`、`education`、`card`、`space`、`all`。

## 查询

```sh
node scripts/run.mjs canvas courses                       # 本学期课程
node scripts/run.mjs canvas assignments --course 12345    # 某门课的作业
node scripts/run.mjs canvas upcoming --days 7             # 未来 7 天到期

node scripts/run.mjs library search --query 线性代数 --field keyword --limit 10
node scripts/run.mjs library item --id 1418962            # 书目详情
node scripts/run.mjs library holdings --id 1418962        # 馆藏单册与在架状态
node scripts/run.mjs library loans                        # 我的借阅（需登录）

node scripts/run.mjs education notices --limit 30         # 1 系统公告
node scripts/run.mjs education timetable --week 8         # 第 8 周课表
node scripts/run.mjs education timetable --weekday 3      # 只看周三

node scripts/run.mjs card balance                         # 一卡通余额
node scripts/run.mjs card transactions --month 2026-11    # 消费流水

node scripts/run.mjs seats free --campus 嘉定 --floor 六楼 --category normal
node scripts/run.mjs seats free --campus 四平          # 全部楼层
node scripts/run.mjs seats free --campus 沪西 --category all
```

## 几条要记住的事实

**图书馆检索不需要登录。** `library search`、`library item`、`library holdings` 打的是公开接口，未登录也能用；只有 `library loans` 需要登录态。这一点和很多校园工具不一样，别一上来就让用户去登录。

**登录态是 cookie + token 两份东西。** Canvas 用 cookie；1 系统用 `X-Token`（sessionStorage 里的 `sessionid`）；图书馆用 `jwt` + `jwtHeader`。它们都存在同一个 `session.json` 里，结构见下。

**1 系统「cookie 还在」不代表能用。** 它的会话在 `sessionStorage` 里，过期了 cookie 还在，必须真打一次接口才知道。`auth status` 就是这么做的。

**课表的 `weeks` 有四种写法。** 数组 `[1,2]`、位串 `"0110..."`、逗号串 `"1,3,5"`、区间 `"1-16"`。`parseWeeks` 全都认，但「短的全 0/1 串」按位串解释（`"0110"` = 第 2、3 周），因为一学期没有第 110 周。

**节次是教学节次不是小时。** `startUnit`/`endUnit` 是第几节课，换算成时间要看学校的作息表。

**一卡通和座位必须开浏览器。** 一卡通的余额是点按钮后异步渲染的，没有直接接口；座位站点的 token 在 `sessionStorage` 里。这两个命令会起一个 headless Chrome，慢一点但可靠。

**座位接口的鉴权头没有空格。** `authorization: "bearer" + token`，写成 `Bearer xxx` 会返回 200 但列表为空 —— 不报错，只是查不到。校区 ID 也不是顺序号（嘉定 1、沪西 19、四平 27、沪北 72），所以运行时先拉楼栋列表按名字匹配。

**课表数据是嵌套的。** 外层是课程，真正的星期/节次/周次在 `timeTableList[]` 里 —— 一门课一周上两次、单双周不同教室都靠它。只读外层会拿到一堆 `weekday: null` 的空壳，看起来像「查到了但没数据」。

**学期名在 `simpleName`。** `schoolCalendar` 里只有 id/year/term/weekNum 这些数字，名字在外层。

## 状态文件

`~/.dsh/state/tongji-online/session.json`（权限 600）：

```json
{
  "version": 2,
  "updatedAt": "2026-11-24T07:00:00.000Z",
  "cookies": [{"name": "...", "value": "...", "domain": ".tongji.edu.cn", "path": "/"}],
  "origins": [{"origin": "https://1.tongji.edu.cn", "localStorage": []}],
  "serviceData": {
    "education": {"sessionId": "..."},
    "library": {"jwt": "...", "jwtHeader": "..."}
  }
}
```

这个路径和「同济校园助手」插件用的完全一致（`TONGJI_ONLINE_HOME` 默认值），所以终端里登录一次，插件那边立刻就能用。写入走「临时文件 + rename」，不会留下半个 JSON。

## 错误码

| code | 含义 | 怎么办 |
|---|---|---|
| `LOGIN_REQUIRED` | 登录态失效 | `auth login --service <站点>` |
| `LOGIN_TIMEOUT` | 窗口里没等到登录完成 | 加大 `--timeout`，或确认扫的是微信码 |
| `INVALID_ARGUMENT` | 参数不对 | 看 `hint` |
| `NETWORK_ERROR` | 连不上 | 检查校园网 / VPN |
| `RATE_LIMITED` | 请求太频繁 | 等一两分钟 |
| `SERVICE_UNAVAILABLE` | 校方服务端出错 | 稍后再试 |
| `SESSION_BUSY` | 另一个进程在用 | 等它结束，或删 `operation.lock` |
| `DEPENDENCY_MISSING` | 缺 `playwright-core` | `npm ci --ignore-scripts` |
| `BROWSER_UNAVAILABLE` | 找不到 Chrome | 用 `TONGJI_ONLINE_CHROME` 指路径 |
| `PAGE_CHANGED` | 接口/页面改版 | 看 `references/` 里的说明 |

## 安全边界

- 所有 HTTP 请求都过路径白名单，只有本文件里列出的那些端点可达 —— 即使参数被注入也打不到别处。
- 响应体上限 5MB，Canvas 分页最多 10 页。
- 登录态文件权限 600，`auth logout` 直接删掉。
- 不做任何写操作：不交作业、不预约座位、不续借、不充值。

## 更多

`references/` 下有各站点的接口说明和页面结构，接口改版时先看那里。
