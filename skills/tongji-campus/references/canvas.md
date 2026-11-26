# Canvas

站点：`https://canvas.tongji.edu.cn`（Canvas LMS，同济自建实例）。

## 鉴权

纯 cookie。`canvas.tongji.edu.cn` 下那几个 `_normandy_session` / `_legacy_normandy_session` 就是会话，`log_session_id` 和 `_csrf_token` 也一起带着。cookie 是 session cookie（关浏览器就失效），所以面板每次刷新前可能会重新走一次统一认证。

**没有 OAuth token 可用**，只能带 cookie。

## 用到的接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/users/self/profile` | 探活 + 拿姓名学号 |
| GET | `/api/v1/courses?enrollment_state=active&enrollment_type=student&per_page=100` | 本学期课程 |
| GET | `/api/v1/courses/{id}/assignments?per_page=100&order_by=due_at` | 某门课的作业 |

分页靠响应头 `Link: <...>; rel="next"`，最多跟 10 页。

## 字段

课程：`id`、`name`、`course_code`、`term.name`、`teachers[].display_name`。`access_restricted_by_date` 为真的课要过滤掉（未开课）。

作业：`id`、`name`、`due_at`（ISO 8601 UTC）、`points_possible`、`has_submitted_submissions`、`html_url`。

`due_at` 可能是 `null`（无截止日期），排序时要单独处理，别直接 `new Date(null)`。

## 状态码

401 → 登录失效；403 → 没权限看这门课；429 → 限流；5xx → 服务端问题。这些都在 `lib/http.mjs` 里统一映射了。

## 已知坑

- `enrollment_state=active` 会漏掉刚选上的课，加 `enrollment_type=student` 更准。
- 有些课 `name` 为空，回落到 `course_code`。
- 作业列表按 `due_at` 升序时，`null` 会排在最前，要自己过滤。
