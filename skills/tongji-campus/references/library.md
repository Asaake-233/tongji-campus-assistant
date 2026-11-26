# 图书馆

站点：`https://webpac.tongji.edu.cn`（检索前端）、`https://webpac1.tongji.edu.cn`（OAuth 入口）。

## 鉴权

- **检索、书目详情、馆藏单册：完全公开**，不需要任何登录态。
- **本人借阅：需要 `jwt`。** 它存在 `sessionStorage` 里（`jwt` 和 `jwtHeader` 两个键），有时也会落成 cookie。请求时要把它作为**动态命名的头**发出去：`headers[jwtHeader] = jwt`。

固定头（所有请求都要带）：

```
mappingPath: s12
groupCode: 201571
x-lang: CHI
content-language: zh_CN
```

## 用到的接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/find/unify/search` | 馆藏检索 |
| GET | `/find/searchResultDetail/getBookDetail?recordId=` | 书目详情 |
| POST | `/find/physical/groupitems` | 单册与在架状态 |
| GET | `/oga/userinfo` | 当前用户（探活用） |
| POST | `/find/loanInfo/loanList` | 我的借阅 |

## 请求体

检索：

```json
{
  "searchField": "keyWord|title|author|isbn",
  "searchFieldContent": "线性代数",
  "matchMode": "2",
  "docCode": [null],
  "page": 1,
  "rows": 10,
  "sortField": "relevance",
  "sortClause": "asc"
}
```

返回 `data.numFound` 和 `data.searchResult[]`。

单册：

```json
{"recordId": 1418962, "entrance": null, "isUnify": true, "page": 1, "rows": 100,
 "year": null, "processType": null, "locationId": null}
```

借阅：

```json
{"page": 1, "rows": 100, "searchType": 1, "searchContent": "", "sortType": 0,
 "startDate": null, "endDate": null}
```

## 返回结构（容易踩的坑）

- **`/find/physical/groupitems` 的 `data` 是对象不是数组**，单册在 `data.list` 里。
- **`/find/loanInfo/loanList` 的列表在 `data.searchResult`**，不是 `list`/`records`；应还日期字段叫 `normReturnDate`（不是 `returnDate`）。可续次数在 `surplusRenewTimes`。
- 书目详情 `data.bean2List` 是 12 条 `{key, description, fieldVal}`，`key` 形如 `cnb01`（题名）、`cnb04`（ISBN）、`cnb10`（载体形态）。

## 单册字段

`callNo`（索书号）、`locationName`（馆藏地）、`processType`（在架/借出）、`curLocationName`（当前所在位置）。

## 已知坑

- 未登录调借阅接口时，服务端只回 `{"success":false,"message":"系统访问中断，请稍后再试！"}`，看不出是要登录 —— 所以代码里先自己判一次 cookie/jwt 再发请求。
- `webpac1` 的 OAuth 入口即使 API 还能用也可能已经过期（会跳 iam 扫码）。**先探测 `/oga/userinfo` 能不能通，能通就别去走 OAuth。**
- 检索结果里 `publishYear` 有时为空，别拿它当必填。
