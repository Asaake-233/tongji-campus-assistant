# 排查

## 先跑自检

```sh
node scripts/run.mjs doctor
```

它检查六项：Node 版本、Chrome 路径、`playwright-core`、状态目录、登录态文件、cookie 数量。

## 常见症状

### `DEPENDENCY_MISSING`：找不到 playwright-core

```sh
cd ~/.dsh/skills/tongji-campus && npm ci --ignore-scripts
```

不想重装就复用别处的：`TONGJI_ONLINE_PLAYWRIGHT=/path/to/playwright-core/index.mjs`。

### `BROWSER_UNAVAILABLE`：启动 Chrome 失败

默认走 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`。换浏览器用 `TONGJI_ONLINE_CHROME`。

插件调用时会传 `TONGJI_ONLINE_CHROME_SANDBOX=0`（它的子进程里沙箱常起不来），手工跑一般不需要。

### `SESSION_BUSY`：另一个进程在用

同一时刻只允许一个进程开浏览器。看看 `operation.lock` 里的 pid 还活着没：

```sh
cat ~/.dsh/state/tongji-online/operation.lock
kill -0 <pid> && echo 还活着 || echo 已经死了
```

死了就直接删锁文件。插件那边每次调用前也会清一次。

### `LOGIN_TIMEOUT`：扫码窗口超时

- 确认扫的是**微信码**（`#tab12Con #wx_QRImage`），不是账号密码那个 tab。
- 加大 `--timeout 600`。
- 窗口被别的窗口挡住时，扫码后页面不会自动跳，要手动点一下。

### `PAGE_CHANGED`：接口改版

校方改了页面结构或接口路径。按 `references/` 里的说明重新对一遍：

1. 浏览器开 devtools，Network 面板看真实请求。
2. 确认路径、方法、请求体、鉴权头。
3. 改对应的 `lib/*.mjs`，再跑 `node lib/verify.mjs`。

### 图书馆「系统访问中断，请稍后再试！」

这是未登录时服务端给的笼统错误。先 `auth status --service library` 看看，再 `auth login --service library`。

### 1 系统 cookie 还在但接口 401

正常现象。1 系统看的是 `sessionStorage.sessionid`（`X-Token` 头），cookie 不作数。重新 `auth login --service education`。

### 命令成功但结果是空的

这是最隐蔽的一类，接口都返回 200，只是数据不对。已经踩过的三个：

| 症状 | 原因 | 位置 |
|---|---|---|
| 座位「房间 0 / 空位 0」 | 没带 `authorization: bearer<token>`（无空格） | `lib/seats.mjs` |
| 座位按楼层查不到 | 用 `premisesName`（楼栋）匹配，应该用 `storeyName` | `lib/seats.mjs` |
| 课表条目有、字段全 null | 只读外层，排课在 `timeTableList[]` | `lib/education.mjs` |

`node lib/verify.mjs` 里有对应的四项断言，改代码后跑一遍能立刻发现。

### 登录窗口不弹，直接说「已登录」

有些单页应用未登录时**不跳转**，只把登录表单显示在当前页面里。判断登录态不能只看 URL：

- 一卡通：看页面有没有「统一认证登陆 / 获取验证码」
- 座位：看 `sessionStorage.token` 在不在

`lib/login.mjs` 的 `landed` 对这两个站点是 async 的，会读页面内容。如果以后加新站点，注意别只写 URL 正则。

## 改完代码怎么验

```sh
node lib/verify.mjs    # 11 项离线断言，不碰网络
node scripts/run.mjs doctor
node scripts/run.mjs library search --query 测试 --limit 1   # 唯一不需要登录的在线验证
```

## 状态目录里的东西

| 文件 | 用途 |
|---|---|
| `session.json` | 登录态（cookie + token），权限 600 |
| `operation.lock` | pid 锁，防并发开浏览器 |
| `panel-cache.json` | **插件**写的面板缓存，技能不碰 |
| `panel-cookies/` | **插件**存的学习通/MOOC/智慧树登录态，技能不碰 |
| `settings.json` | **插件**的开关，技能不碰 |
| `browser-profile/` | 技能开有头窗口时用的临时 Chrome profile |

删 `session.json` 等于退出登录（`auth logout` 就是干这个）。
