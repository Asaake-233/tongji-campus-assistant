# tongji-campus

同济大学校园信息查询技能。给「同济校园助手」插件和 AI 会话共用。

## 安装

```sh
cd ~/.dsh/skills/tongji-campus
npm ci --ignore-scripts     # 装 playwright-core
node scripts/run.mjs doctor
```

## 首次登录

```sh
./tj.sh auth login --service all
```

会弹出一个 Chrome 窗口，微信扫码。扫完所有站点都通了。

## 目录

```
SKILL.md              技能说明（给 AI 看的）
lib/
  cli.mjs             命令分发、JSON 输出约定
  env.mjs             路径与外部依赖（只在这里定）
  errors.mjs          统一错误类型
  http.mjs            带路径白名单的请求
  session.mjs         session.json 读写
  lock.mjs            pid 锁
  browser.mjs         Playwright 封装
  login.mjs           静默优先的登录流程
  canvas.mjs          Canvas 适配器
  library.mjs         图书馆适配器
  education.mjs       1 系统适配器
  card.mjs            一卡通（必须开浏览器）
  seats.mjs           座位（必须开浏览器）
  verify.mjs          11 项离线自检
scripts/run.mjs       入口
references/           各站点接口说明
```

## 设计取舍

**只读。** 不做交作业、预约座位、续借、充值这些写操作 —— 一个能被模型调用的工具不该有副作用。

**路径白名单。** 所有请求都过 `lib/http.mjs` 的 `assertPath`，只放行明确列出的端点。参数可能来自模型，不能让它变成任意 URL 代理。

**静默优先。** `auth login` 先探测；能用就不开窗口。图书馆的 OAuth 入口常过期但 API 还有效，所以探测比走跳转可靠。

**状态目录唯一。** 默认 `~/.dsh/state/tongji-online`，和插件一致。老版本默认到 `~/Library/Application Support`，导致终端和插件看到两套登录态。

**输出一行 JSON。** stdout 只有结果，日志走 stderr。插件 `JSON.parse(stdout)` 就能拿到。
