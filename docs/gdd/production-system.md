# 《崗起》生產系統 GDD v2.0 — 節次入口與核心規則

| 項 | 值 |
| --- | --- |
| 狀態 | **確定**（節次入口／核心規則速覽）。正式全文在 [production-system-v2.md](production-system-v2.md)，**不在本檔再貼一份 SQL／JSON** |
| 濃縮契約 | [../production-system.md](../production-system.md) |
| 分冊 | [0001](0001-overview.md)–[0007](0007-scope-expansion.md) 與全文同義拆讀 |
| 入帳時間 | 聽 [系統定義 v1.0 §5](../system-definition.md)。GDD 原稿 `maxOfflineGameSec=86400` **已被系統定義覆寫**，只當日長，不得入帳 |

工作區已有同等 GDD 全文（v2.0）。本檔對齊節號、掃描核心規則，禁止再寫第二套規則正文。衝突時：規則聽 [production-system-v2.md](production-system-v2.md)；**入帳離線上限聽系統定義**；技術棧聽 [ADR 0001](../adr/0001-tech-stack.md)。

**實作對齊（不改 GDD 規則）：** Prisma 對應 PostgreSQL；結算用 `lastSettledAt` + 懶結算。SQL 是設計約定，不是遷移腳本。

---

## 核心精神

引擎只認識**規則**與**類型**，**永不修改**。資料驅動。生產方式由規則自動生成。規則可繼承／組合／覆寫。驗證器把關。每筆可發布資料帶 `released_in_version`、`is_active`。不跳級。層級與繼承圖是 **DAG**，禁止循環。

---

## 時間

```
gameTime = startGameTime + (now - startRealTime) / 1000 × timeScale
```

不存「當前遊戲時間」。客戶端僅顯示，判定以伺服器為準。無加速。懶結算。

| 層 | 鍵 | 值 |
| --- | --- | --- |
| GDD 原稿 | `timeScale` | `60` |
| GDD 原稿 | `maxOfflineGameSec` | `86400`（1 遊戲日＝24 現實分鐘；**不入帳**） |
| GDD 原稿 | `tickIntervalRealMs` | `5000` |
| 實作日長 | `gameDayGameSec` | `86400`（承接原稿；**不是**入帳 cap） |
| 產品入帳（系統定義覆寫） | `maxOfflineRealSec` | `28800`（**8 現實小時**） |
| 產品入帳衍生 | `Config.maxOfflineGameSec` | `1728000`（20 遊戲日） |

---

## 分層

| 層 | 代碼 | 規則 |
| --- | --- | --- |
| 物質 | T | T1 開採；T2 同位素**首發關閉**。T 不能由 P 製成 |
| 產物 | P | P1 僅 T；P2 至少 1 個 P1；P3 至少 1 個 P2。不跳級 |

物品 = **類型 + 屬性**。層寫在 `items.layer`；層級由規則輸入推導，快取在 `items.derived_tier`。

---

## 公式、繼承、方式

公式引擎白名單：`+` `-` `*` `/` `min` `max` `floor` `ceil` `round` `if`。其餘驗證失敗。

繼承：單親 DAG；深度上限 **10**；無循環。組合不用多親欄位合併（R-INH4）。

`production_methods` 只由 `MethodGenerator` 從規則生成。禁止手寫孤兒方式。

---

## Schema 摘要（閱讀型，非遷移腳本）

JSONB + GIN。關鍵表：`game_config`、`item_types`、`items`、`building_defs`／`building_levels`、`production_rules`、`production_methods`、`players`、`player_inventory`、`player_buildings`。另有 `item_properties`、`item_type_properties`、`server_state`（可與 `game_config` 合成單列）。

| 表 | 關鍵欄／規則 |
| --- | --- |
| `game_config` | `time_scale=60`、`max_offline_real_sec=28800`、`max_offline_game_sec=1728000`、`tick_interval_real_ms=5000`、`game_day_game_sec=86400` |
| `items` | `type_id`、`layer`、`derived_tier`、`properties` JSONB、`is_active`、`released_in_version` |
| `production_rules` | `parent_rule_id`、`inputs`／`outputs` JSONB、`duration_game_sec`、`formulas`、`is_active`、`released_in_version` |
| `production_methods` | 必須有 `rule_id`；禁止孤兒 |
| `player_buildings` | 雙時鐘：`last_settled_at`（真實，入帳）+ `last_settled_game`（遊戲秒快照） |
| `players` | MVP 一列匿名存檔槽，無登入 |

完整 SQL：[production-system-v2.md §10](production-system-v2.md#10-schema) · [0005](0005-schema-and-api.md)。

---

## 核心引擎模組

`GameClock`、`Config`、`Settlement`（`simulation`）；`FormulaEngine`、`RuleEngine`、`MethodGenerator`、`LoopGenerator`、`Validator`（`rules`）；`Inventory`、`Production`、`Building`（`inventory`）。禁止再建模組名叫 `core`。

明細：[0006](0006-engine.md)。

---

## API（前綴 `/api/v1`）

GET 可結算實體時先懶結算。明細：[production-system-v2.md §12](production-system-v2.md#12-api) · [../api/v1.md](../api/v1.md) · [../mvp.md](../mvp.md)。

| 方法 | 路徑 | MVP |
| --- | --- | --- |
| GET | `/time`、`/items`、`/item-types`、`/production-rules`、`/production-methods`、`/state` | **是** |
| GET | `/loops` | 可延後 |
| POST | `/buildings`、`/buildings/:id/start`（選定方式）、`/buildings/:id/stop` | **是** |
| POST | `/buildings/:id/collect`、`/validate` | 是／可 |
| WS | Socket.IO | **否**（後繼） |

---

## 驗證清單

V-SKIP、V-DOWN、V-T-P、V-CYCLE、V-ID、V-OUT、V-TIME、V-TIER、V-INH、V-FORMULA、V-METHOD、V-OFFLINE（cap=`28800` 現實秒）、V-ACTIVE。全文：[§15](production-system-v2.md#15-驗證清單)。

---

## 擴展層次 L1～L4

| 層 | 改什麼 | 改引擎？ |
| --- | --- | --- |
| L1 | 資料內容 | 否 |
| L2 | 類型與系統包 | 否（驗證器仍須過） |
| L3 | 規則能力（新白名單函數等） | 是（小） |
| L4 | 機制／架構（市場、推送、Redis） | 是（大；常需 ADR） |

---

## 節 1–17

| 節 | 題 | 全文 | 分冊 | 覆蓋 |
| --- | --- | --- | --- | --- |
| 1 | 概述 | [§1](production-system-v2.md#1-概述) | [0001](0001-overview.md) | 網頁、1:60、首發農礦化工通用 |
| 2 | 時間系統 | [§2](production-system-v2.md#2-時間系統) | [0002](0002-time-and-settlement.md) | gameTime、game_config、GET /time |
| 3 | 分層 | [§3](production-system-v2.md#3-分層) | [0003](0003-tiers-and-types.md) | T／P、R-T、R-P、倍率 |
| 4 | 類型與屬性 | [§4](production-system-v2.md#4-類型與屬性) | [0003](0003-tiers-and-types.md) | 三張目錄表 |
| 5 | 生產方式 | [§5](production-system-v2.md#5-生產方式) | [0004](0004-rules-and-methods.md) | 鐵錠三種方式 |
| 6 | 規則 | [§6](production-system-v2.md#6-規則) | [0004](0004-rules-and-methods.md) | `production_rules` |
| 7 | 公式 | [§7](production-system-v2.md#7-公式) | [0004](0004-rules-and-methods.md) | 白名單 |
| 8 | 繼承 | [§8](production-system-v2.md#8-繼承) | [0004](0004-rules-and-methods.md) | R-INH1～6 |
| 9 | 優化 | [§9](production-system-v2.md#9-優化) | [0004](0004-rules-and-methods.md) | 優化維度 |
| 10 | Schema | [§10](production-system-v2.md#10-schema) | [0005](0005-schema-and-api.md) | 完整 SQL |
| 11 | 核心引擎模組 | [§11](production-system-v2.md#11-核心引擎模組) | [0006](0006-engine.md) | core／systems 對照 |
| 12 | API | [§12](production-system-v2.md#12-api) | [0005](0005-schema-and-api.md) · [api/v1](../api/v1.md) | 端點表 |
| 13 | 首發範圍 | [§13](production-system-v2.md#13-首發範圍) | [0007](0007-scope-expansion.md) · [launch-scope](launch-scope.md) | 核心循環 |
| 14 | 擴展 | [§14](production-system-v2.md#14-擴展) | [0007](0007-scope-expansion.md) | 擴展策略 |
| 15 | 驗證清單 | [§15](production-system-v2.md#15-驗證清單) | [0005](0005-schema-and-api.md) | V-* |
| 16 | 可擴展性 | [§16](production-system-v2.md#16-可擴展性) | [0007](0007-scope-expansion.md) | L1–L4 |
| 17 | 文件狀態 | [§17](production-system-v2.md#17-文件狀態) | [0001](0001-overview.md) | v2.0 確定 |

目錄索引：[README.md](README.md)。
