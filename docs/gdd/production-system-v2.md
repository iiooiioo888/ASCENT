# 《帝國掘起》遊戲設計文件 v2.0（生產系統）

| 項 | 值 |
| --- | --- |
| 專案 | 帝國掘起 |
| 版本 | **v2.0 確定** |
| 狀態 | **確定**。設計契約，可作為實作依據。**本檔為正式全文**（`docs/gdd/production-system-v2.md`） |
| 日期 | 2026-10-06 |
| 核心 | 規則驅動生產系統。引擎只認識規則與類型，**永不修改** |
| 分冊 | [0001](0001-overview.md)–[0007](0007-scope-expansion.md) 與本檔同義拆讀；衝突時規則以本檔為準 |
| 節次入口 | [production-system.md](production-system.md)（舊錨點，禁止再貼全文） |
| 濃縮契約 | [../production-system.md](../production-system.md)（不是第二套全文） |

產品範圍、優先級、離線入帳上限聽 [系統定義 v1.0](../system-definition.md)（[system-definition-v1.md](../system-definition-v1.md) 僅轉址）。技術棧聽 [ADR 0001](../adr/0001-tech-stack.md)。規則作為架構約束見 [ADR 0003](../adr/0003-production-rules.md)。農業切片槽位見 [mvp-agriculture-catalog.md](mvp-agriculture-catalog.md)。本檔即《帝國掘起》遊戲設計文件 v2.0 的正式落地（節 1–17，不刪減規則）。與 ADR 一致：時間系統用**懶結算**（`timeScale=60`），不是每遊戲秒 tick 建築。

**實作對齊（不改本檔規則）：** 開工時以 **Prisma 對應 PostgreSQL**；結算用 **`lastSettledAt` + 懶結算**。GDD 的 SQL 是設計約定，不是遷移腳本。可變 `properties`／公式／隊列用 JSONB + GIN。細則見 [架構總覽](../architecture/overview.md) 與 [時間與結算](../architecture/time-and-settlement.md)。

程式已在倉庫。本檔仍是規則全文，不隨任務改寫。任務見 [next.md](../next.md)。

---

## 核心條款（不刪減）

- 引擎只認識規則與類型，**永不修改**。
- 資料驅動；規則自動生成生產方式；繼承／組合／覆寫；驗證器；`released_in_version` 與 `is_active`；不跳級；DAG；時間組件式可配。
- 物質層 T 與產物層 P；層級自動推導；類型 + 屬性；多生產方式；公式引擎白名單；繼承深度上限 10。
- 首發：農業 + 礦業 + 基礎化工 + 通用；T2 同位素關閉。
- 核心循環：農業／礦業／化工／通用／能源。
- 時間系統用**懶結算**（`timeScale=60`），不是每遊戲秒 tick 建築。

---

## 目錄

標題保持短名以穩定錨點。覆蓋範圍如下（不另開第二套章節）：

1. [概述](#1-概述) — 模擬經營／生產鏈、網頁、1 現實秒＝60 遊戲秒、遊戲 1 天＝24 現實分鐘、首發農業＋礦業＋基礎化工＋通用
2. [時間系統](#2-時間系統) — 算出來不存下來、gameTime、game_config、儲存規則、GET /api/v1/time
3. [分層](#3-分層) — 分層架構 T／P、R-T1～R-T3、R-P1～R-P4、層級自動推導、時間／成本倍率
4. [類型與屬性](#4-類型與屬性) — `item_types`、`item_properties`、`items`
5. [生產方式](#5-生產方式) — `production_methods`、鐵錠三種方式範例
6. [規則](#6-規則) — `production_rules`、繼承欄位、由規則自動生成方式
7. [公式](#7-公式) — 公式引擎白名單變數與運算
8. [繼承](#8-繼承) — R-INH1～R-INH5（另含 R-INH6 深度 ≤ 10）
9. [優化](#9-優化) — 生產方式優化維度與目標
10. [Schema](#10-schema) — 完整 DB schema（含 `server_state`、`game_config`、目錄與執行期表）
11. [核心引擎模組](#11-核心引擎模組) — GameClock、FormulaEngine、RuleEngine、MethodGenerator、LoopGenerator、Validator、Settlement、Production
12. [API](#12-api) — 端點表
13. [首發範圍](#13-首發範圍) — 首發範圍與核心循環
14. [擴展](#14-擴展) — 擴展策略
15. [驗證清單](#15-驗證清單)
16. [可擴展性](#16-可擴展性) — L1–L4
17. [文件狀態](#17-文件狀態) — v2.0 **確定**

---

## 1. 概述

### 1.1 專案

| 欄位 | 值 |
| --- | --- |
| 名稱 | 帝國掘起 |
| 類型 | 無限發展的模擬經營／生產鏈 |
| 平台 | **網頁**（手機為同一網頁體驗的目標載體，見系統定義） |
| 核心 | 規則驅動生產（產品核心：生產鏈深度） |
| 時間 | **1 現實秒 = 60 遊戲秒 = 1 遊戲分鐘**；**遊戲 1 天 = 24 現實分鐘** |
| 首發產業 | 農業 + 礦業 + 基礎化工 + 通用（能源為核心循環約束；物流可選） |
| 勝利條件 | 無 |

引擎只認識**規則**與**類型**。引擎永不修改規則；規則變更走資料與驗證器，不走熱修補程式。

### 1.2 核心精神

- 資料驅動：物品、規則、方式、層級、解鎖都是資料。
- 規則自動生成生產方式：`production_methods` 不是手寫第二套配方。
- 規則可繼承、組合、覆寫（R-INH1～6）。
- 驗證器把關層級、依賴、循環、解鎖、公式、繼承深度。
- 每筆可發布資料帶 `released_in_version`、`is_active`。
- 不跳級；層級與繼承圖是 DAG，禁止循環。
- **時間組件式可配**：工時、倍率、層級帶是資料（見 [0003 §3.5](0003-tiers-and-types.md)），不是引擎寫死的數值表。
- 可配置、可觀測。

### 1.3 可擴充原則（必須可執行）

| 原則 | 落地 |
| --- | --- |
| 資料驅動 | 物品／規則／方式／層級／解鎖都是資料；引擎不改它們 |
| 規則生成方式 | `MethodGenerator` 寫 `production_methods`；禁止手寫孤兒 |
| 繼承／組合／覆寫 | R-INH1～6；單親 DAG；深度 ≤ 10 |
| 驗證器把關 | 層級、依賴、循環、解鎖、公式；失敗不得生效 |
| `released_in_version` | 未到版本不得當已解鎖內容 |
| `is_active` | 關閉則不得進已啟用規則／方式 |
| 不跳級 | P 一次 +1；T 升層最多 +1；未解鎖層不得引用 |
| DAG 不循環 | 繼承、層級依賴、公式參照皆禁止循環 |
| 可配置 | 平衡只改資料，再跑驗證器 |
| 可觀測 | 結算區間、是否觸及離線上限、規則／方式來源可查（v1.x） |

### 1.4 引擎只做這些，不做那些

| 做 | 不做 |
| --- | --- |
| 讀規則與類型 | 改規則內容、改類型定義 |
| 依規則生成方式與迴圈 | 為單一物品寫死生產函數 |
| 驗證後才讓資料生效 | 跳過驗證器上線 |
| 依真實時間差懶結算 | 對每座建築每遊戲秒跑迴圈 |
| 伺服器入帳 | 讓客戶端寫回權威庫存 |

### 1.5 分層一句話

物質層 T 與產物層 P。T 不可由 P 製成；P 升層一次只升一級且必須含上一級 P。細則：[0003](0003-tiers-and-types.md)。

### 1.6 時間一句話

`timeScale = 60`：1 真實秒 = 60 遊戲秒 = 1 遊戲分鐘。GDD 原稿 `maxOfflineGameSec=86400`（1 遊戲日＝24 真實分鐘，**日長／原稿紀錄**）。入帳上限 **8 現實小時**（`maxOfflineRealSec=28800`，衍生 1,728,000 遊戲秒）。`tickIntervalRealMs = 5000`。實體同時存真實 `lastSettledAt` 與遊戲 `last_settled_game`；結算用真實差 × 60。不存「現在的遊戲時間」。細則：[0002](0002-time-and-settlement.md)。

### 1.7 名稱對齊

| 說法 | 意思 |
| --- | --- |
| NestJS 模組 `catalog` / `rules` / `simulation` / `inventory` / `realtime` / `jobs` | 部署與 DI 邊界。`realtime`／`jobs` 為目標棧；MVP 可不掛載 |
| GDD `GameClock`、`Settlement`、`FormulaEngine`… | 純計算物件，放進 `simulation` 或 `rules`，不開 HTTP |
| 禁止 | 再建一個 NestJS 模組叫 `core` |

完整表：[architecture/overview.md](../architecture/overview.md)、[0001-module-boundaries.md](../architecture/0001-module-boundaries.md)。

### 1.8 三層內容（禁止壓成一層）

| 層 | 系統 | 物品 | 法源 |
| --- | --- | --- | --- |
| 工程 MVP | 農業 1 | 5–10 | [mvp.md](../mvp.md) |
| 目標首發 | ≥5：農、礦、化工、通用、能源；物流可選 | 50–100 | 全文 §13 + 系統定義 §2 |
| 長期 | 資料擴充 | 不設引擎頂 | [../roadmap.md](../roadmap.md) |

### 1.9 首發範圍（摘要）

農業 + 礦業 + 基礎化工 + 通用。能源為核心循環約束。物流可選。T2 同位素關閉。細則：[0007](0007-scope-expansion.md)。工程 MVP 見 [mvp.md](../mvp.md)。

---

## 2. 時間系統

時間是**算出來的**，不是存下來的。不對每座建築每遊戲秒跑迴圈。懶結算。無加速。`timeScale` 寫死為 60，不是 61。「真實時間」與「現實時間」同義（wall clock）。

### 2.0 兩層數字（禁止混成兩套入帳）

GDD 原稿三常數**必須出現在本檔**（86400 **不得**拿來裁切產能）：

```json
{
  "timeScale": 60,
  "maxOfflineGameSec": 86400,
  "tickIntervalRealMs": 5000
}
```

入帳 cap **只准**系統定義的 8 現實小時。86400 不得用來裁切產能。

| 層 | 鍵 | 值 | 用途 |
| --- | --- | --- | --- |
| GDD v2.0 原稿 | `timeScale` | `60` | 比例；寫死 |
| GDD v2.0 原稿 | `maxOfflineGameSec` | `86400` | **日長**＝1 遊戲日＝24 真實分鐘。原稿曾用此值當離線上限 |
| GDD v2.0 原稿 | `tickIntervalRealMs` | `5000` | 粗粒度 tick（真實毫秒），不是遊戲秒迴圈 |
| 實作日長 | `gameDayGameSec` | `86400` | 承接 GDD 原稿同值；日曆／顯示；**不是**入帳 cap |
| 產品入帳（權威） | `maxOfflineRealSec` | `28800` | **8 現實小時**。產能真實差先 cap 此值 |
| 產品入帳（衍生） | `Config.maxOfflineGameSec` | `1728000` | `28800 × 60`＝20 遊戲日。**不是**把 GDD 原稿改寫成此數 |

開工 `game_config` **只准一列入帳 cap**：`max_offline_real_sec=28800`、`max_offline_game_sec=1728000`。ADR 0001 不另定第二套上限。

禁止：用 86400／1440 裁切產能；把 GDD 原稿 86400 改寫成 1728000 冒充原稿；`1 真實秒 = 61 遊戲秒`；每遊戲秒迴圈。

### 2.1 比例（寫死）

- **1 真實秒 = 60 遊戲秒 = 1 遊戲分鐘**
- 真實 1 分鐘 = 遊戲 1 小時
- 真實 1 小時 = 遊戲 60 小時
- **遊戲 1 天 = 24 真實分鐘 = 86400 遊戲秒**（日長，不是入帳上限）
- 真實 1 日 = 遊戲 60 日

| 真實 | 遊戲 |
| --- | --- |
| 1 秒 | 60 秒 = 1 分鐘 |
| 1 分鐘 | 1 小時 |
| 1 小時 | 60 小時 |
| 24 分鐘 | 1 遊戲日 = **86400 遊戲秒** |
| 1 日 | 60 日 |
| 8 小時 | 480 遊戲小時 = **1,728,000 遊戲秒**＝入帳上限 |

### 2.2 顯示公式與儲存規則

世界時鐘只存錨點，不存「現在」。

| 欄位 | 時間種類 | 存？ | 用途 |
| --- | --- | --- | --- |
| `start_real_time` / `startRealTime` | 真實（Unix 毫秒或 TIMESTAMPTZ） | 是 | 世界起點 |
| `start_game_time` / `startGameTime` | 遊戲秒 | 是 | 起點對應的遊戲秒 |
| `finish_at` / `finishAt` | 真實 | 是（可空） | 世界結束；空 = 仍在進行 |
| `last_update` | 真實 | 是 | 世界列最後寫入 |
| `time_scale` | — | 是 | 必須 = 60 |
| `max_offline_real_sec` | 真實秒 | 是 | 必須 = 28800（入帳） |
| `max_offline_game_sec` | 遊戲秒 | 是 | 必須 = 1728000（入帳衍生） |
| `tick_interval_real_ms` | 真實毫秒 | 是 | 必須 = 5000 |
| `game_day_game_sec` | 遊戲秒 | 是 | 必須 = 86400（日長；承接原稿 `maxOfflineGameSec`） |
| **當前遊戲時間** | 遊戲秒 | **否** | 讀取時推算 |

`now` 與 `startRealTime` 為 Unix 毫秒：

```
gameTime = startGameTime + (now - startRealTime) / 1000 × timeScale
```

客戶端可用此式本地推算。`GET /api/v1/time` 只回傳顯示用欄位。**判定與入帳以伺服器結算為準。**

### 2.3 實體雙時鐘

GDD 的 `last_settled_game` / `last_update_game` 是**遊戲秒快照**。ADR 的 `lastSettledAt` 是**真實游標**。實體必須**同時保存**兩套，禁止只用其中一套入帳。

| 欄位 | JSON | 時間種類 | 角色 |
| --- | --- | --- | --- |
| `last_settled_at` | `lastSettledAt` | **真實** | **權威游標**。該時刻以前的產出已入帳 |
| `last_settled_game` | `lastSettledGame` | **遊戲秒** | 快照，供顯示與除錯，**不得單獨入帳** |
| `last_update` | `lastUpdate` | **真實** | 本列最後一次寫入 |
| `last_update_game` | `lastUpdateGame` | **遊戲秒** | 上述寫入當下的顯示用遊戲秒 |
| `finish_at` | `finishAt` | **真實** | 本段生產預計結束（可空） |

結算用真實差 × 60 得到遊戲時間差，不用遊戲欄位相減當產能：

```
rawRealDeltaSec     = max(0, nowReal - lastSettledAt)
cappedRealDeltaSec  = min(rawRealDeltaSec, maxOfflineRealSec)   // 28800
gameDeltaSec        = cappedRealDeltaSec × timeScale            // × 60
```

GDD 原稿若用 `86400 / 60 = 1440` 真實秒當 cap，**僅作歷史紀錄**。實作 `offlineCapRealSec` **必須**是 `28800`。

若 `last_settled_game` 與由 `lastSettledAt` 推回的值不一致，**以真實 `lastSettledAt` 重算**，再寫回兩個欄位。

### 2.4 懶結算契約

不對每座建築每遊戲秒跑迴圈。只在下列時機，把一個實體從 `lastSettledAt` 補算到本次 `nowReal`：

| 時機 | 目標棧 | MVP |
| --- | --- | --- |
| 讀取或操作該實體（GET／開工／停止／收取） | 要 | **要**（請求路徑必做） |
| 粗粒度 tick（`tickIntervalRealMs=5000`） | BullMQ `jobs` | 可選 NestJS 定時器；可不啟 |
| 上線／離線補算 | 要 | 無登入時以**進頁 GET** 代替 |

純函數（`simulation.Settlement`）：

- 輸入：`lastSettledAt`、本次 `nowReal`、輸入／輸出／庫存快照、配方與規則、`Config`。
- 輸出：這段（裁切後）遊戲時間的結算結果。
- 同輸入同結果。內部不讀 `Date.now()`、不寫庫、不發網。
- `nowReal` 由呼叫端（`inventory` / `jobs`）注入。

步驟（冪等）：

1. 算 `rawRealDeltaSec`、`cappedRealDeltaSec`、`gameDeltaSec`（上式；cap = 28800）。
2. 用 `gameDeltaSec` 算產出／消耗（工時單位是遊戲秒）。
3. `inventory` 入帳（同一入口）。失敗則不推進游標。
4. 寫入成功後**兩個時鐘一起推進到本次 now**：
   - `lastSettledAt = nowReal`（不是 `lastSettledAt + capped`）
   - `last_settled_game = gameTime(nowReal)`（顯示時鐘，**不裁切**）
   - `last_update` / `last_update_game` 同步
5. 上限以外的真實區間視為已結算且**產能為 0**，不得在後續請求再補產。禁止只把游標推進 28800 秒留下餘額。

顯示用 `gameTime` 不因離線上限凍結。產能才裁切。

伺服器是唯一權威。前端可用 `packages/shared` 同一純函數預覽，預覽不得寫回庫存。

### 2.5 `GET /api/v1/time`

| 項 | 契約 |
| --- | --- |
| 路由模組 | `inventory`（可碰 HTTP） |
| 計算 | 呼叫 `simulation.GameClock`；**禁止**在 `simulation` 開 Controller |
| 回傳 | `startRealTime`、`startGameTime`、`serverRealTime`、`displayGameTime`、`timeScale=60` |
| 不做 | 不結算建築、不改庫存、不推進 `lastSettledAt` |
| 判定 | 僅顯示。入帳仍走建築／庫存 GET 或寫入 API 的懶結算 |

### 2.6 已作廢／禁止（明示）

| 來源 | 處理 |
| --- | --- |
| 用 `maxOfflineGameSec=86400` **入帳**（24 真實分鐘） | **禁止**。86400 只當日長與 GDD 原稿紀錄 |
| 原稿「28800 遊戲秒 = 遊戲內 8 小時」 | **廢棄**（與 1:60 矛盾：8 現實小時 × 60 = 480 遊戲小時） |
| 「產品 8 現實小時與 GDD 衝突時以 86400 入帳」 | **禁止** |
| 把 GDD 原稿 86400 改寫成 1728000 冒充原稿 | **禁止** |
| Schema 預設 86400、另加可空 28800 當第二套 cap | **禁止**（兩套入帳） |
| `1 真實秒 = 61 遊戲秒` | **禁止** |
| 每座建築每遊戲秒迴圈 | **禁止** |
| 只存遊戲欄、不存 `lastSettledAt` | **禁止** |

---

## 3. 分層

物質層 **T** 與產物層 **P**。層寫在 `items.layer`。層級 `n` 由規則輸入**自動推導**，快取在 `items.derived_tier`。手填與推導不一致 → 驗證失敗。

| 層 | 代碼 | 含義 |
| --- | --- | --- |
| 物質層 | `T` | 原料、中間物質、同位素等；由採集或 T→T 精製而來 |
| 產物層 | `P` | 加工產物；由 P（及可選的 T 輔助）而來 |

物質層**內容帶**（不是規則 ID；勿與 R-T1／R-T2 混淆）：

| 內容帶 | 含義 | 目標首發 |
| --- | --- | --- |
| T1 | 開採／提取。純採集：`derived_tier = 1` | 開 |
| T2 | 同位素 | **關**（`is_active=false`） |

### 3.1 物質層規則

| ID | 規則 |
| --- | --- |
| R-T1 | T 不可由 P 製成。產出為 T 的規則，輸入不得含 P。 |
| R-T2 | 產出 T(n) 的規則，T 輸入只能是 T(≤n)。 |
| R-T3 | T 可作任何規則的輸入（含產出為 P 的規則）。 |

### 3.2 產物層規則

| ID | 規則 |
| --- | --- |
| R-P1 | P(n)（n≥2）必須含至少一個 P(n-1) 輸入。P1 是引導層：輸入可以全是 T。 |
| R-P2 | P 規則可含 T 作為輔助輸入。 |
| R-P3 | P 不可作 T 的輸入（與 R-T1 同一約束，兩邊都要檢）。 |
| R-P4 | 一次只升一級：產出 P(n) 時，`n = max(P 輸入層級) + 1`；禁止 +2 及以上。P1 無 P 輸入。 |

### 3.3 層級自動推導

對每條規則的每個產出物品：

1. 讀該物品目錄上的 `layer`（T 或 P）。引擎不改此欄。
2. 把輸入分成 `T_in`、`P_in`。
3. **產出為 T**
   - `P_in` 必須為空，否則 R-T1 / R-P3 失敗。
   - 無物品輸入（純採集）：`derived_tier = 1`。
   - 有 T 輸入：預設 `derived_tier = max(T_in.tier)`。
   - 允許顯式升一級：`derived_tier = max(T_in.tier) + 1`，且該層已 `released_in_version` 且 `is_active`。禁止 +2。禁止低於 `max(T_in.tier)`。
   - 所有 T 輸入層級 ≤ 產出層級（R-T2）。
4. **產出為 P**
   - `P_in` 為空：`derived_tier = 1`（P1 引導）。
   - `P_in` 非空：`derived_tier = max(P_in.tier) + 1`，且必須存在層級恰好為 `derived_tier - 1` 的 P 輸入。
   - T 輔助合法（R-P2），不參與 `max(P_in)`。
5. 寫入／核對 `items.derived_tier`。同一物品若被多條**已啟用**規則產出，推導層級必須相同。

不跳級還包含：不得把未 `released_in_version` 或 `is_active=false` 的層／物品當輸入或產出。首發關閉的 T2 同位素不得出現在已啟用規則裡。

### 3.4 時間／成本倍率對照

工時是規則資料，不是引擎寫死。下表即**層級工時帶**（建議值，非硬頂）。相對倍率供數值表使用；驗證器硬約束仍是正整數（V-TIME）。公式變數 `tier` 可另寫 `base * tier`，與本表不互斥——以該規則 `formulas` 為準。

換算：遊戲秒 ÷ 60 = 真實秒（`timeScale=60`）。

### 3.5 層級工時帶（時間組件式可配）

| 層 | 遊戲秒（建議） | 真實時間（建議） | 相對倍率 | 首發 |
| --- | --- | --- | --- | --- |
| T1 | 1200～3600 | 20～60 秒 | 1x | 開 |
| T2 | 7200～43200 | 2～12 分 | 4x | **關** |
| P1 | 1800～5400 | 30～90 秒 | 1x | 開 |
| P2 | 3600～10800 | 1～3 分 | 2x | 開 |
| P3 | 7200～21600 | 2～6 分 | 4x | 開 |

### 3.6 首發層級開關

| 層 | 目標首發 | 工程 MVP |
| --- | --- | --- |
| T1 | 開 | 農業切片內開 |
| T2 同位素 | **關**（`is_active=false`） | 同樣關閉 |
| P1 | 開（僅 T） | 農業切片內開 |
| P2／P3 | 開（遵守 R-P1／R-P4） | 僅當農業切片需要 |
| 農業物品 | 開 | **只啟用農業切片**（5–10 物品） |
| 礦業／基礎化工／通用 | 開 | 不啟用這些大包 |
| 能源 | 核心循環約束物 | 可用占位消耗欄 |
| 物流 | 可選 | 不做 |

## 4. 類型與屬性

物品 = **類型 + 屬性**。三張目錄表，職責分開。類型**不**編碼 T/P。

| 表 | 職責 | 例子 |
| --- | --- | --- |
| `item_types` | 類型（分類） | 作物、礦石、中間體、化工品、能源載體、通用件 |
| `item_properties` | 屬性定義 | 純度、含水、同位素標記、熱值 |
| `items` | 具體物品：一個類型 + 一組屬性值 | 小麥、鐵礦、鐵錠、硫酸、電力 |

JSONB `items.properties` 只准出現已定義且套用到該類型的屬性鍵。查詢用 GIN（ADR）。

### 4.1 類型（`item_types`）

| 欄位 | 約束 |
| --- | --- |
| `code` | 唯一、穩定 ID |
| `name` | 顯示名 |
| `is_active` | 關閉則其下物品不得進已啟用規則 |
| `released_in_version` | 未到版本不得當已解鎖內容 |
| `metadata` | JSONB，預設 `{}` |

### 4.2 屬性定義（`item_properties`）

| 欄位 | 約束 |
| --- | --- |
| `code` | 唯一；公式用 `item.<code>` 參照 |
| `value_kind` | `number` / `bool` / `string` |
| `is_active` | 關閉則物品不得帶此鍵 |
| `released_in_version` | 同上 |

套用關係見 Schema 的 `item_type_properties`。

### 4.3 物品（`items`）

| 欄位 | 約束 |
| --- | --- |
| `code` | 唯一、穩定 ID |
| `type_id` | 必須存在 |
| `layer` | `T` 或 `P` |
| `derived_tier` | 正整數，由 3.3 推導 |
| `properties` | JSONB，鍵必須是已套用屬性 |
| `rarity` | 目標首發 4–5 級；MVP 可空 |
| `is_active` | 首發可關閉個別物品（如 T2 同位素） |
| `released_in_version` | 未到版本不得解鎖 |

引擎不得在執行期改 `layer`、`type_id`、規則公式。平衡只改資料，再跑驗證器。

| 產品要求（系統定義 §2，目標首發） | 落點 | MVP |
| --- | --- | --- |
| 品質連續 0–100% | 目錄可用 `item.quality`；庫存堆疊另存 `player_inventory.quality` | 可暫不帶或固定 100 |
| 稀有度 4–5 級 | 目錄欄或屬性（如 `rarity`），不是新的 T/P 層 | 可暫不帶 |
| 50–100 物品 | 目標首發數量；類型仍用本檔三表 | 工程 MVP 僅 5–10，且限農業 |

不得為稀有度／品質再發明一套與 T/P 平行的層級規則。

---

## 5. 生產方式

兩張表，一個方向：

| 表 | 誰寫 | 誰讀 |
| --- | --- | --- |
| `production_rules` | 設計資料 | `RuleEngine`、`Validator`、`MethodGenerator` |
| `production_methods` | **只由** `MethodGenerator` 從規則生成 | 建築開工、結算、UI |

禁止手寫與規則不一致的 `production_methods`。方式必須能指回一條規則（`rule_id`）。引擎不修改規則列。

`MethodGenerator` 讀已解析且驗證通過的規則，沿優化維度展開為一筆或多筆 `production_methods`。同一規則可生成多種方式，每筆都必須 `rule_id` 指回來源。

`LoopGenerator` 在已生成方式上標出核心循環（農業／礦業／化工／通用／能源）。物品互為輸入輸出可以成**產業迴圈**；規則繼承、層級依賴、公式參照仍禁止循環。

| 對象 | 決策 |
| --- | --- |
| 已生成的 `production_methods` 種類 | 引擎**無硬頂** |
| 單一建築開工隊列 | **有限制**（數字待數值表；MVP 可先鎖很小常數） |
| 切換方式 | 可切換，**有成本**。順序：先結算當前、扣成本、再套用新方式。MVP 可先不做切換 |
| 半自動循環 | 目標首發；MVP 可只做開工後依時間產出、進頁收取 |

### 5.1 鐵錠三種方式範例（契約示意，非平衡定案）

產出：`item_iron_ingot`（P1；輸入全是 T）。三種方式由規則生成，禁止手寫孤兒。

| 方式 | 來源規則 | 典型輸入 | 工時（相對 `base`） | 目標 |
| --- | --- | --- | --- | --- |
| 基礎冶煉 `method_iron_ingot_basic` | `rule_iron_smelting_basic` | 鐵礦 + 煤 | ×1 | 低門檻、慢 |
| 高爐 `method_iron_ingot_blast` | `rule_iron_smelting_blast` | 鐵礦 + 焦炭 + 熔劑 | ×0.7 | 更快、吃能源 |
| 直接還原 `method_iron_ingot_direct` | `rule_iron_smelting_direct` | 更高純度鐵礦 + 還原氣 | ×1.2 | 高純度／高產率 |

## 6. 規則

`production_rules` 是唯一的配方語意來源。

| 欄位 | 約束 |
| --- | --- |
| `code` | 唯一穩定 ID，如 `rule_iron_smelting_basic` |
| `parent_rule_id` | 0 或 1 個；繼承見第 8 節 |
| `inputs` | JSONB 陣列；每項含物品 ID、數量公式或常數 |
| `outputs` | JSONB 陣列；**至少一個**產出 |
| `duration_game_sec` | 基準工時，正整數（**遊戲秒**），對應公式變數 `base` |
| `formulas` | JSONB；只准白名單。可含 `duration`，求值後必須是正整數 |
| `compositions` | JSONB 規則 ID 陣列；組合約束（R-INH4），預設 `[]` |
| `overrides` | 子規則欄位級覆寫 |
| `is_active` | false 則不得生成已啟用方式 |
| `released_in_version` | 未到版本不得生效 |

時間單位是**遊戲秒**。結算時用裁切後的真實差 × 60 得到可用遊戲秒，再套工時（`formulas.duration` 若存在則用求值結果，否則 `duration_game_sec`）。建議落在 [0003 §3.5](0003-tiers-and-types.md) 層級工時帶。

`inputs` / `outputs` 元素至少含 `item_id`（或穩定 `key` + `itemId`）、數量（常數或公式名）。

解析順序：根 → 子覆寫 → 驗證器 → `MethodGenerator`。

### 6.1 規則 JSON 範例（契約示意，非平衡定案）

```json
{
  "id": "rule_iron_smelting_basic",
  "code": "rule_iron_smelting_basic",
  "parent_rule_id": null,
  "inputs": [
    {"key": "ore", "item_id": "item_iron_ore", "qty": 1},
    {"key": "fuel", "item_id": "item_coal", "qty": 1}
  ],
  "outputs": [
    {"item_id": "item_iron_ingot", "qtyFormula": "input.ore * item.yield"}
  ],
  "duration_game_sec": 3600,
  "formulas": {
    "duration": "base",
    "yield": "input.ore * item.yield",
    "energy": "base * tier"
  },
  "compositions": [],
  "overrides": {},
  "is_active": true,
  "released_in_version": "v1.0"
}
```

## 7. 公式

只允許下列運算與函數，其餘一律驗證失敗：

| 類 | 允許 |
| --- | --- |
| 運算 | `+` `-` `*` `/` |
| 函數 | `min` `max` `floor` `ceil` `round` `if` |
| `if` 形 | `if(cond, a, b)`，`cond` 為比較（`>` `<` `>=` `<=` `==` `!=`） |

禁止：自訂函數、迴圈、指派、存取未聲明變數、除以常數 0。`/` 的除數在求值時為 0 → 該次驗證／結算失敗，不寫庫。

| 前綴 | 含義 | 例 |
| --- | --- | --- |
| `item.X` | 主體／產出物品屬性 `X` | `item.purity` |
| `parent.X` | 繼承解析後，父規則的公式或欄位 `X` | `parent.duration` |
| `input.X` | 具名輸入的數量或屬性 | `input.ore` |
| `base` | 規則上的基準常數 | 基準工時 |
| `tier` | 產出物品的 `derived_tier` | 層級係數 |
| `level` | 建築或方式等級（沒有則 0） | 等級加成 |

未在白名單與該規則輸入／屬性中出現的名字 → 不可解析。

`if` 例：`if(item.purity >= 0.9, base, base * 2)`。

### 7.1 公式 JSON 範例（契約示意，非平衡定案）

```json
{
  "duration": "base",
  "yield": "input.ore * item.yield",
  "energy": "base * tier",
  "quality": "if(item.purity >= 0.9, 100, 80)"
}
```

`if` 例：`if(item.purity >= 0.9, base, base * 2)`。求值結果寫入結算，不回寫規則列。

## 8. 繼承

| ID | 規則 |
| --- | --- |
| R-INH1 | 單親：`parent_rule_id` 最多一個。繼承圖必須是 DAG，禁止循環。 |
| R-INH2 | 欄位繼承：子規則未覆寫的欄位，解析值等於父規則（遞迴到根）。 |
| R-INH3 | 欄位覆寫：只覆寫聲明欄位；合併後的完整規則必須通過驗證器。 |
| R-INH4 | 組合：多條規則同時約束同一產出時，用組合集合（全部通過才合法），**不用多親合併欄位**。 |
| R-INH5 | 可見性：父規則 `is_active=false` 或未到 `released_in_version` 時，子規則不得單獨生效。子規則可更嚴，不得比父更早解鎖。 |
| R-INH6 | **深度上限 10**：根為深度 0；從根走到本規則的**邊數** ≤ 10。超過驗證失敗，不得生成方式。 |

### 8.1 規則範例（契約示意，非平衡定案）

**`rule_iron_smelting_basic`（根）** — 產出鐵錠（P1）

| 欄 | 值 |
| --- | --- |
| 輸入 | `ore`＝鐵礦（T）、`fuel`＝煤（T） |
| 產出 | 鐵錠（P1 引導） |
| 工時 | `base`（正整數遊戲秒） |
| 產數 | `input.ore * item.yield` |
| 能耗 | `base * tier` |

**`rule_iron_smelting_blast`（父：basic）**

| 覆寫 | 例 |
| --- | --- |
| 工時 | `floor(parent.duration * 0.7)` |
| 能耗 | `parent.energy + item.heat` |
| 產數 | 繼承 |

**`rule_iron_smelting_direct`（父：basic）**

| 覆寫 | 例 |
| --- | --- |
| 工時 | `ceil(parent.duration * 1.2)` |
| 產數 | `input.ore * max(item.yield, parent.yield)` |
| 輸入 | 可收緊為更高純度 T（仍 ≤ 產出層，R-T2） |

## 9. 優化

`MethodGenerator` 沿下列維度展開。維度值來自規則資料（含繼承後的公式），不是引擎寫死的數值表。

| 優化維度 | 含義 | 進入結算 | 目標（設計意圖） |
| --- | --- | --- | --- |
| `duration` | 遊戲秒工時 | 是 | 快／慢路線可並存 |
| `yield` | 產出倍率 | 是 | 高產率常伴隨更嚴輸入或更長工時 |
| `energy` | 能源消耗／產出 | 是 | 能源成為核心循環約束 |
| `input_factor` | 輸入倍率 | 是 | 省料 vs 費料 |
| `byproduct` | 副產開關或比例 | 是 | 化工／礦業副產不另寫死函數 |
| `level` | 方式等級，公式變數 `level` | 是 | 與建築等級相乘，不是新的 T/P 層 |

方式種類無引擎硬頂；隊列有限。建築等級 `modifiers` 可再乘上 duration／yield／energy。專精、耐久、相鄰不在 MVP；耐久只影響效率、不歸零。

驗證失敗的規則不得生成方式，不得被建築選用。完整清單見 [0005](0005-schema-and-api.md)。

---

## 10. Schema

GDD 語意表如下。**實作時以 Prisma 對應 PostgreSQL**；結算用 **`lastSettledAt` + 懶結算**。下列 SQL 是設計約定，不是遷移腳本。

庫欄位 snake_case，API JSON camelCase。對照：`last_settled_at` = `lastSettledAt`，`last_settled_game` = `lastSettledGame`，`last_update_game` = `lastUpdateGame`。

開工 Prisma **只建一套表**。

| 定名 | 舊稿／合併別名 | 備註 |
| --- | --- | --- |
| `server_state` | 可與 `game_config` 合成單列 | 世界時鐘錨點（GDD 語意表） |
| `game_config` | `world_clock` | 時間常數；Prisma 可與 `server_state` 合成 |
| `player_buildings` | `buildings` | 可結算實體；雙時鐘 |
| `player_inventory` | `inventories` | 玩家堆疊數量權威 |
| `building_defs` / `building_levels` | — | 建築目錄與等級 |
| `players` | — | MVP 一列匿名存檔槽，無帳密 |

### 目錄表

```sql
-- 設計約定（非遷移腳本）

CREATE TABLE item_types (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  released_in_version   TEXT NOT NULL,
  metadata              JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE item_properties (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  value_kind            TEXT NOT NULL, -- number | bool | string
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  released_in_version   TEXT NOT NULL
);

CREATE TABLE item_type_properties (
  type_id               TEXT NOT NULL REFERENCES item_types (id),
  property_id           TEXT NOT NULL REFERENCES item_properties (id),
  PRIMARY KEY (type_id, property_id)
);

CREATE TABLE items (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  type_id               TEXT NOT NULL REFERENCES item_types (id),
  layer                 TEXT NOT NULL, -- T | P
  derived_tier          INTEGER NOT NULL CHECK (derived_tier >= 1),
  properties            JSONB NOT NULL DEFAULT '{}',
  rarity                INTEGER,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  released_in_version   TEXT NOT NULL
);
CREATE INDEX items_properties_gin ON items USING GIN (properties);

CREATE TABLE production_rules (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  parent_rule_id        TEXT REFERENCES production_rules (id),
  inputs                JSONB NOT NULL,
  outputs               JSONB NOT NULL,
  duration_game_sec     INTEGER NOT NULL CHECK (duration_game_sec >= 1),
  formulas              JSONB NOT NULL DEFAULT '{}',
  compositions          JSONB NOT NULL DEFAULT '[]',
  overrides             JSONB NOT NULL DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  released_in_version   TEXT NOT NULL
);
CREATE INDEX production_rules_inputs_gin ON production_rules USING GIN (inputs);
CREATE INDEX production_rules_formulas_gin ON production_rules USING GIN (formulas);

CREATE TABLE production_methods (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  rule_id               TEXT NOT NULL REFERENCES production_rules (id),
  optimization          JSONB NOT NULL DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  released_in_version   TEXT NOT NULL
);
```

`inputs` / `outputs` 元素至少含 `item_id`、數量（常數或公式名）。`outputs` 陣列長度 ≥ 1。

### 建築目錄

```sql
CREATE TABLE building_defs (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  system_code           TEXT NOT NULL,
  footprint             INTEGER NOT NULL DEFAULT 1,
  can_upgrade           BOOLEAN NOT NULL DEFAULT TRUE,
  can_specialize        BOOLEAN NOT NULL DEFAULT TRUE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  released_in_version   TEXT NOT NULL
);

CREATE TABLE building_levels (
  building_def_id       TEXT NOT NULL REFERENCES building_defs (id),
  level                 INTEGER NOT NULL CHECK (level >= 1),
  modifiers             JSONB NOT NULL DEFAULT '{}',
  queue_limit           INTEGER NOT NULL CHECK (queue_limit >= 1),
  PRIMARY KEY (building_def_id, level)
);
```

### 世界時鐘與執行期

權威 cap：`time_scale=60`、`max_offline_real_sec=28800`、`max_offline_game_sec=1728000`、`tick_interval_real_ms=5000`。日長 `game_day_game_sec=86400` 承接 GDD 原稿 `maxOfflineGameSec`，**不得**當入帳上限。

GDD 語意上 `game_config`（常數）與 `server_state`（錨點）分開。Prisma 可合成單列，但**禁止兩列各寫一套 `timeScale`**。下列 SQL 維持拆表；若 MVP 合成，欄位語意仍須齊全。結算用 `last_settled_at` + 懶結算。

```sql
CREATE TABLE game_config (
  id                      SMALLINT PRIMARY KEY CHECK (id = 1),
  time_scale              INTEGER NOT NULL DEFAULT 60,
  game_day_game_sec       INTEGER NOT NULL DEFAULT 86400,
  max_offline_real_sec    INTEGER NOT NULL DEFAULT 28800,
  max_offline_game_sec    INTEGER NOT NULL DEFAULT 1728000,
  tick_interval_real_ms   INTEGER NOT NULL DEFAULT 5000
);

CREATE TABLE server_state (
  id                      SMALLINT PRIMARY KEY CHECK (id = 1),
  start_real_time         TIMESTAMPTZ NOT NULL,
  start_game_time         BIGINT NOT NULL,
  finish_at               TIMESTAMPTZ,
  last_update             TIMESTAMPTZ NOT NULL
);

CREATE TABLE players (
  id                    TEXT PRIMARY KEY,
  created_at            TIMESTAMPTZ NOT NULL,
  last_seen_at          TIMESTAMPTZ NOT NULL
);

CREATE TABLE player_inventory (
  player_id             TEXT NOT NULL REFERENCES players (id),
  item_id               TEXT NOT NULL REFERENCES items (id),
  quantity              NUMERIC NOT NULL,
  quality               NUMERIC NOT NULL DEFAULT 100
                        CHECK (quality >= 0 AND quality <= 100),
  PRIMARY KEY (player_id, item_id)
);

CREATE TABLE player_buildings (
  id                    TEXT PRIMARY KEY,
  player_id             TEXT NOT NULL REFERENCES players (id),
  building_def_id       TEXT NOT NULL REFERENCES building_defs (id),
  level                 INTEGER NOT NULL DEFAULT 1,
  specialization        TEXT,
  durability            NUMERIC NOT NULL DEFAULT 100,
  method_id             TEXT REFERENCES production_methods (id),
  last_settled_at       TIMESTAMPTZ NOT NULL,
  last_settled_game     BIGINT NOT NULL,
  last_update           TIMESTAMPTZ NOT NULL,
  last_update_game      BIGINT NOT NULL,
  finish_at             TIMESTAMPTZ,
  queue                 JSONB NOT NULL DEFAULT '[]',
  inputs                JSONB NOT NULL DEFAULT '{}',
  outputs               JSONB NOT NULL DEFAULT '{}',
  status                TEXT NOT NULL
);
CREATE INDEX player_buildings_inputs_gin ON player_buildings USING GIN (inputs);
```

| 位置 | 存什麼 |
| --- | --- |
| `player_buildings.inputs` / `outputs` | 本段生產的配方快照 |
| `player_inventory` | 數量權威 |
| `last_settled_at` | **真實**游標，入帳依據 |
| `last_settled_game` | **遊戲秒**快照，不得單獨入帳 |

結算：真實差 = `nowReal − lastSettledAt`，先以 `maxOfflineRealSec=28800` 裁切，再 × 60，遊戲秒最多 `1728000`。寫入成功後 `lastSettledAt = nowReal`，`last_settled_game = gameTime(nowReal)`。GDD 原稿 `86400/60=1440` 真實秒留在 GDD 當日長紀錄，不裁切產能。細則：[0002](0002-time-and-settlement.md)。

專精欄位一經非空即不可改回。耐久只影響效率。**MVP 無登入**：`players` 仍有一列匿名存檔槽。

---

## 11. 核心引擎模組

GDD `core/` 是純計算物件名，**不是** NestJS 模組名。禁止再建模組叫 `core`。之後開工時放進 `packages/shared`，由 NestJS 模組引用。衝突時：技術棧聽 ADR 0001；入帳時間聽系統定義 §5 與本檔第 2 節。完整邊界：[architecture/overview.md](../architecture/overview.md)。

GDD 原稿把純計算放在 `core/`，執行期系統放在 `systems/`：

```
core/
  Config
  GameClock
  Settlement
  FormulaEngine
  RuleEngine
  MethodGenerator
  LoopGenerator
  Validator
systems/
  Inventory
  Production
  Building
```

| 物件 | 職責 | NestJS 模組 | 可碰 HTTP／DB／WS | MVP |
| --- | --- | --- | --- | --- |
| `Config` | `timeScale=60`、`gameDayGameSec=86400`、`maxOfflineRealSec=28800`、`maxOfflineGameSec=1728000`、`tickIntervalRealMs=5000`；不讀環境當第二套比例 | `simulation` | 否 | 要 |
| `GameClock` | 推算 `gameTime`；真實／遊戲換算 | `simulation` | 否 | 要 |
| `Settlement` | 懶結算純函數 | `simulation` | 否 | 要 |
| `FormulaEngine` | 白名單求值 | `rules` | 否 | 要 |
| `RuleEngine` | 繼承、組合、覆寫 | `rules` | 否 | 要 |
| `MethodGenerator` | 規則 → 方式 | `rules` | 否 | 要 |
| `LoopGenerator` | 標產業迴圈 | `rules` | 否 | 可簡化 |
| `Validator` | 驗證清單 | `rules` | 否（可被管理端呼叫） | 要 |
| `systems.Inventory` | 庫存讀寫；唯一入帳入口 | `inventory` | 可 | 要 |
| `systems.Production` | 開工／停止／收取前先結算 | `inventory` | 可 | 要 |
| `systems.Building` | 放置與建築狀態 | `inventory` | 可 | 要 |
| 推送 | 只推已提交結果 | `realtime` | 只 WS | **關** |
| BullMQ tick | 呼叫同一結算入口 | `jobs` | 經同一入口 | **關** |

`simulation` 不開 Controller、不寫庫、不讀 `Date.now()`。`realtime` 只推已提交結果。`jobs` 與 `inventory` 同一結算入口。

```
settle(entity, nowReal, clock, rules, catalog) → SettlementResult
```

前端可用 `packages/shared` 同一純函數預覽；預覽不得寫回。

GDD 原稿 `Config`（必須保留，86400 **不入帳**）：

```json
{
  "timeScale": 60,
  "maxOfflineGameSec": 86400,
  "tickIntervalRealMs": 5000
}
```

實作 `Config`（入帳 cap 聽系統定義；日長承接原稿 86400）：

```json
{
  "timeScale": 60,
  "gameDayGameSec": 86400,
  "maxOfflineRealSec": 28800,
  "maxOfflineGameSec": 1728000,
  "tickIntervalRealMs": 5000
}
```

不得把 86400 從文件刪掉，也不得用 86400 裁切產能。

## 12. API

前綴 `/api/v1`。伺服器權威。GET 可結算實體時先懶結算。獨立端點表：[../api/v1.md](../api/v1.md)。

### 路由歸屬

| 路徑前綴 | 模組 | 純計算 |
| --- | --- | --- |
| `GET /api/v1/time` | `inventory` | `simulation.GameClock` |
| `GET /api/v1/item-*` | `catalog` | 無結算 |
| `GET /api/v1/production-*`、`/loops`、`POST /validate` | `rules` | `Validator` 等 |
| `GET/POST /api/v1/inventory`、`/buildings`、`/state` | `inventory` | `Settlement` |
| Socket.IO | `realtime` | 無（MVP 關） |

### 時間

| 方法 | 路徑 | 行為 | MVP |
| --- | --- | --- | --- |
| GET | `/api/v1/time` | 回傳 `startRealTime`、`startGameTime`、`serverRealTime`、`displayGameTime`、`timeScale=60`。僅顯示。 | 是 |

```json
{
  "startRealTime": "2026-10-06T00:00:00.000Z",
  "startGameTime": 0,
  "serverRealTime": "2026-10-06T00:10:00.000Z",
  "displayGameTime": 36000,
  "timeScale": 60
}
```

### 目錄（只讀）

| 方法 | 路徑 | MVP |
| --- | --- | --- |
| GET | `/api/v1/item-types` | 是 |
| GET | `/api/v1/item-properties` | 是 |
| GET | `/api/v1/items` | 是 |
| GET | `/api/v1/items/:id` | 是 |

### 規則與方式（只讀）

| 方法 | 路徑 | MVP |
| --- | --- | --- |
| GET | `/api/v1/production-rules` | 是 |
| GET | `/api/v1/production-rules/:id` | 是 |
| GET | `/api/v1/production-methods` | 是 |
| GET | `/api/v1/production-methods/:id` | 是 |
| GET | `/api/v1/loops` | 可延後 |

### 驗證

| 方法 | 路徑 | MVP |
| --- | --- | --- |
| POST | `/api/v1/validate` | 可 |

### 庫存與建築

| 方法 | 路徑 | MVP |
| --- | --- | --- |
| GET | `/api/v1/inventory` | 是 |
| GET | `/api/v1/state` | 是 |
| GET | `/api/v1/buildings` | 是 |
| GET | `/api/v1/buildings/:id` | 是 |
| POST | `/api/v1/buildings` | 是 |
| POST | `/api/v1/buildings/:id/start` | 是 |
| POST | `/api/v1/buildings/:id/stop` | 是 |
| POST | `/api/v1/buildings/:id/collect` | 是 |

### 即時（Socket.IO，非權威）

| 事件 | 內容 |
| --- | --- |
| `settlement` | 已提交的結算區間與庫存變化 |
| `production_complete` | 已提交的完工 |

斷線不影響 PostgreSQL。MVP **不啟用** Socket.IO。

原稿「GET time / items / types / rules / methods / loops / state；POST method / stop / buildings」落地如下（不另開第二套路徑）：

| 原稿 | 本檔 |
| --- | --- |
| GET time | GET /api/v1/time |
| GET items / types | GET /api/v1/items、/item-types |
| GET rules / methods / loops | GET /api/v1/production-rules、/production-methods、/loops |
| GET state | GET /api/v1/state |
| POST method | POST /api/v1/buildings/:id/start（選定方式開工） |
| POST stop | POST /api/v1/buildings/:id/stop |
| POST buildings | POST /api/v1/buildings |

開工 JSON 範例：

```json
{
  "methodId": "method_iron_ingot_basic",
  "inputs": {
    "item_iron_ore": 1,
    "item_coal": 1
  }
}
```

---

## 13. 首發範圍

（目標首發，不是工程 MVP）

| 包 | 目標首發 |
| --- | --- |
| 農業 | 開 |
| 礦業 | 開 |
| 基礎化工 | 開 |
| 通用 | 開 |
| 能源 | 核心循環約束（供給／消耗），不是獨立科技樹大包 |
| 物流 | 可選、不強制 |
| T2 同位素 | **關**（`is_active=false`） |

核心循環五條都要能被 `LoopGenerator` 標出。物品 50–100；稀有度 4–5；品質 0–100%。

建築產品規則（升級、專精不可逆、耐久只影響效率、佔地可擴張、多種相鄰加成）屬目標首發；schema 預留欄位。

工程 MVP：僅農業、5–10 物品、3–5 建築、5–10 方式。不得把本節縮成 MVP。見 [mvp.md](../mvp.md)。

### 13.1 目標首發統計（設計目標，非引擎硬頂）

方式由規則生成，引擎對方式種類無硬頂。物品合計（含關閉的 T2）須落在 50–100。

| 項 | 數量 | 狀態 |
| --- | --- | --- |
| T1 | 25 | 開 |
| T2 | 8 | **關閉** |
| P1 | 17 | 開 |
| P2 | 13 | 開 |
| P3 | 6 | 開 |
| 物品合計 | 69（含關閉的 8） | 落在 50–100 |
| 建築定義 | 32 | 目標首發目錄 |
| 規則 | 8 | `production_rules` |
| 生產方式 | ~50 | 由 8 條規則生成的約數 |

## 14. 擴展

| 階段 | 做 | 不做 |
| --- | --- | --- |
| 工程 MVP | 農業切片 + 懶結算 + 存檔 | 登入、市場、排行、Redis、WS、加速、Phaser |
| v1.0 目標首發 | 本檔產業包；驗證清單全過 | T2 同位素；Phaser 進核心；客戶端寫回庫存 |
| v1.x | 觀測、驗證報表、只改資料平衡 | 改引擎原則；跳級 |
| v2.0 內容 | 開啟 T2 同位素（改旗標 + 完整驗證） | 改成多親欄位合併；改 1:60 |

改框架或改時間比例必須另開 ADR。細則：[roadmap.md](../roadmap.md)。

本節是目標首發的擴展節奏，不是「尚未建碼」。程式現況與任務見 [next.md](../next.md)。

---

## 15. 驗證清單

| 代碼 | 檢查 |
| --- | --- |
| V-SKIP | 不跳級：P 一次 +1；T 升層最多 +1；未解鎖層／物品不得當輸入或產出 |
| V-DOWN | 不降級 |
| V-T-P | T 不依賴 P（R-T1 / R-P3） |
| V-CYCLE | 無循環：繼承、層級、公式參照皆為 DAG |
| V-ID | 所有 ID 存在 |
| V-OUT | 每條規則至少一個輸出 |
| V-TIME | `duration_game_sec` 為正整數；`formulas.duration` 求值亦為正整數 |
| V-TIER | 層級自動推導與 `derived_tier` 一致 |
| V-INH | R-INH1～6（含深度 ≤ 10） |
| V-FORMULA | 僅白名單、可解析 |
| V-METHOD | 已啟用方式皆有已啟用 `rule_id`；禁止孤兒 |
| V-OFFLINE | 入帳 `maxOfflineRealSec=28800`、`Config.maxOfflineGameSec=1728000`；離線路徑必須 cap。用 `86400`／`1440` 當 cap **失敗**。GDD 仍須能表達原稿 `maxOfflineGameSec=86400` 為日長（`gameDayGameSec`） |
| V-ACTIVE | `is_active` 與 `released_in_version`（含 T2 同位素關閉） |

任一來失敗：該規則／方式不得進 `is_active` 生效集。

---

## 16. 可擴展性

| 層 | 名稱 | 改什麼 | 改引擎？ | 例子 |
| --- | --- | --- | --- | --- |
| L1 | 資料內容 | 物品、規則數字、建築 modifiers、旗標 | 否 | 多一種作物、改工時 |
| L2 | 類型與系統包 | 新類型、新屬性、新產業包 | 否（驗證器仍須過） | 開啟礦業；開啟 T2 同位素 |
| L3 | 規則能力 | 新優化維度、新白名單函數、新驗證條款 | 是（小） | 新增 `clamp` |
| L4 | 機制／架構 | 新結算模型、市場、推送、渲染層 | 是（大；常需 ADR） | Socket.IO、Redis、獨立 Phaser 層 |

L1／L2 不得修改規則語意。禁止為新版本手寫孤兒方式。引入 Redis／Socket.IO 是 L4 部署能力，不改結算公式，且不得從 ADR 0001 定案表刪除。Phaser 若要做地圖，以獨立渲染層接 React，只讀已結算狀態，不進核心棧。

---

## 17. 文件狀態

| 項 | 狀態 |
| --- | --- |
| 濃縮契約 | [../production-system.md](../production-system.md) |
| GDD v2.0 節 1–17 | 設計契約，可作為實作依據。**正式全文即本檔**（`production-system-v2.md`） |
| 節次入口 | [production-system.md](production-system.md) 節次入口與核心規則速覽，不是第二套全文 |
| 應用程式 / monorepo / 依賴 | 已在倉庫根 `apps/`、`packages/shared`。本 GDD 仍不改技術棧。下一步見 [next.md](../next.md) |
| 技術棧 | ADR 0001 已鎖定，本 GDD 不改框架 |
| Phaser | 不進入核心棧 |
| Redis | 不是主庫 |
| GDD 原稿時間常數 | `timeScale=60`、`maxOfflineGameSec=86400`、`tickIntervalRealMs=5000`（86400＝日長，**不入帳**） |
| 入帳離線上限 | 系統定義：8 現實小時（`maxOfflineRealSec=28800`） |

---

## 相關文件

| 文件 | 職責 |
| --- | --- |
| [系統定義 v1.0](../system-definition.md) | 產品範圍、優先級、離線 8 現實小時 |
| [ADR 0001](../adr/0001-tech-stack.md) | 技術棧與 1:60 |
| [ADR 0003](../adr/0003-production-rules.md) | 規則／驗證作為架構約束 |
| [ADR 索引](../adr/README.md) | 編號約定 |
| [節次入口](production-system.md) | 舊錨點，不是第二套全文 |
| [分冊索引](README.md) | 0001–0007 |
| [launch-scope.md](launch-scope.md) | 目標首發範圍、統計、改版節奏 |
| [mvp-agriculture-catalog.md](mvp-agriculture-catalog.md) | 工程 MVP 農業槽位（非整數值） |
| [架構總覽](../architecture/overview.md) | NestJS 模組、Prisma 對齊 |
| [時間與結算](../architecture/time-and-settlement.md) | 懶結算、冪等 |
| [API v1](../api/v1.md) | 端點表 |
| [mvp.md](../mvp.md) | 工程 MVP |
| [架構契約](../architecture.md) | 模組／懶結算／權威／冪等／離線上限 |
| [docs 索引](../README.md) | 閱讀順序與衝突表 |
