# 一卡通与座位

这两个站点的共同点：**没有可直接调用的公开 API**，必须开浏览器。所以它们比其它命令慢（3–10 秒），但结果可靠。

## 一卡通

站点：`https://yikatong.tongji.edu.cn`（Vue 单页应用）。

### 余额

流程：

1. 打开首页，如果被重定向到 `iam.tongji.edu.cn` 说明没登录。
2. 进 `https://yikatong.tongji.edu.cn/ppage/service`（服务大厅）。
3. 点 `[onclick*="余额查询"]`。
4. **等文本出现**，不要固定 sleep —— 余额是异步渲染的。

解析两条正则：

```js
/账户总额[:：]\s*￥?\s*(-?[\d,]+(?:\.\d+)?)/          // 总额
/(\S*卡账户)\s*余额\s*\1?\s*(-?[\d,]+(?:\.\d+)?)/g    // 各子账户
```

金额可能带千分位逗号，解析前要 `replace(/,/g, "")`。

### 消费流水

服务大厅里点「消费流水」标签，然后抓第一个 `<table>` 的 `tr/td`。只抓当前可见页，不翻页 —— 面板只需要概览。

如果表格在 iframe 里会抓不到，`note` 字段会提示。

## 座位预约

站点：`https://space.tongji.edu.cn/h5/#/home`。

### 鉴权

`sessionStorage.token`，请求头是 `authorization: "bearer" + token`（注意 **bearer 和 token 之间没有空格**，这是站点的写法）。

漏掉这个头，接口**仍然返回 200**，只是 `data.list` 是空数组 —— 不会报错，看起来像「今天没有空位」。

token 在 sessionStorage 里，外面拿不到，所以必须开一次浏览器让 SPA 自己写进去。

### 接口

```
POST /reserve/index/index   body {"id": 1}           → 校区/楼栋列表（premises）
POST /reserve/index/list    body {"id": 1, "date": "2026-11-24", "categoryIds": ["1"],
                                  "premisesIds": [1], "size": 100, "page": 1}
```

### 参数

校区 ID 是数据库主键，不是顺序号。实测：`嘉定=1`、`沪西=19`、`四平=27`、`沪北=72`、`德文图书馆=86`、`东区图书馆=159`。

所以代码里**不写死**：先 `POST /reserve/index/index` 拿 `data.premises[]`，按名字匹配（用户说「嘉定」，站点上叫「嘉定校区图书馆」）。

座位类别：`normal=["1"]`（普通）、`research=["3"]`（研学室）、`exam=["4"]`（考试座位）、`all=["1","3","4"]`。

**绝大多数房间都挂在 type 1 下**，按 `["3"]` 或 `["4"]` 筛会得到空列表。代码里空了就退回 `all`，避免「查不到」被误读成「没座位」。

### 字段

| 字段 | 含义 |
|---|---|
| `name` | 房间名，如「六楼阅览区-北」 |
| `storeyName` | 楼层，如「六楼」 |
| `premisesName` | **楼栋**名，如「嘉定校区图书馆」（不是房间） |
| `free_num` | 剩余座位 |
| `total_num` | 总座位 |

按楼层筛选要看 `storeyName`。用 `premisesName` 会拿到楼栋名，永远对不上「六楼」。

### 已知坑

- `date` 要 `YYYY-MM-DD`，按**东八区**算当天，不能用 UTC 的 `toISOString().slice(0,10)`（会差一天）。
- `--floor 六楼` 同时匹配 `storeyName` 和 `name`，两者都含楼层字样。
- 一卡通首页未登录时**不跳转**，只把登录表单显示在页面里 —— 判断登录态要看页面有没有「统一认证登陆 / 获取验证码」，光看 URL 会误判成已登录。
- SPA 刚打开时 token 还没写进 sessionStorage，要等 3 秒左右。
