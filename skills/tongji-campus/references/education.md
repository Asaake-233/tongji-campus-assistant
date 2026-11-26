# 1 系统（教务）

站点：`https://1.tongji.edu.cn`。

## 鉴权

**不是 cookie，是 `X-Token` 头。** token 存在 `sessionStorage.sessionid`（有时也在 `localStorage`），32 位。cookie 也带着，但决定成败的是这个头。

所以「cookie 还在」完全不代表能用 —— 必须真打一次接口。`auth status` 里 education 那一项就是靠 `/api/sessionservice/session/getSessionUser` 探的。

登录入口：`https://1.tongji.edu.cn/api/ssoservice/system/loginIn`，它会 302 到 iam 的 `/idp/oauth2/authorize?client_id=SYS20230001`。

## 用到的接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/sessionservice/session/getSessionUser` | 当前用户（探活） |
| GET | `/api/baseresservice/schoolCalendar/currentTermCalendar?flag=0` | 当前学期 |
| GET | `/api/electionservice/reportManagement/findStudentTimetab?calendarId={id}` | 课表 |
| POST | `/api/commonservice/commonMsgPublish/findMyCommonMsgPublish` | 我的公告 |

公告的 body 是 `{"pageNum_": 1, "pageSize_": 30}`，注意那两个下划线。返回按 `publishTime` 降序。

## 课表的 weeks 字段

这是最容易出错的地方。同一所学校不同学期会用四种写法：

| 形态 | 例子 | 含义 |
|---|---|---|
| 数组 | `[1, 2]` | 第 1、2 周 |
| 位串 | `"0101...0"`（16 位） | 第 i 位为 1 表示第 i 周有课 |
| 逗号串 | `"1,3,5"` | 第 1、3、5 周 |
| 区间 | `"1-16"` | 第 1 到 16 周 |

`parseWeeks()` 全都认。判位串的规则是「全 0/1 且长度 ≥3」—— 两位以内的 `"10"`、`"12"` 显然是周次数字，而一学期不存在第 110 周。

## 课表结构（嵌套，容易踩坑）

返回的 `data` 是**课程数组**，排课信息在每门课的 `timeTableList[]` 里：

```
data[]                          ← 一门课
  courseName, courseCode, teacherName, remark
  timeTableList[]               ← 这门课的所有时段
    dayOfWeek   1=周一
    timeStart   第几节开始（不是小时）
    timeEnd     第几节结束
    weeks       该时段的周次
    roomLable   "四平路校区" / "线上课堂"
    campusI18n  校区全名
```

一门课一周上两次、单双周不同教室，都是靠 `timeTableList` 里的多条记录表达的。**只读外层会拿到 `dayOfWeek: null` 的空壳**，看起来像「查到了但没数据」。

## 学期

`currentTermCalendar` 返回：

```json
{
  "schoolCalendar": {"id": 122, "year": 2026, "term": 1, "weekNum": 23, "beginDay": 1789315200000},
  "week": 11,
  "simpleName": "2026-2027学年度第1学期"
}
```

**学期名在 `simpleName`**，不在 `schoolCalendar` 里。`schoolCalendar` 只有数字字段。

## 已知坑

- `currentTermCalendar` 返回的结构有两种：`{schoolCalendar: {...}}` 或直接 `{...}`，都要兼容。
- 课表接口偶尔返回 `{list: [...]}`，偶尔直接数组。
- 业务码在 `payload.code`，200 和 0 都算成功；其它值要当错误抛，别静默返回空数组。
