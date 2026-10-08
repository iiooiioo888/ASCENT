# GDD 0001：概述（節 1、17）

與 [production-system-v2.md](production-system-v2.md) §1、§17 同義拆讀。正式全文：[production-system-v2.md](production-system-v2.md)。節次入口：[production-system.md](production-system.md)。技術邊界：[ADR 0001](../adr/0001-tech-stack.md)。

## 文件狀態（節 17）

| 項 | 狀態 |
| --- | --- |
| 濃縮契約 | [../production-system.md](../production-system.md) |
| GDD v2.0 節 1–17 | 設計契約，可作為實作依據。**正式全文：** [production-system-v2.md](production-system-v2.md) |
| 應用程式 / monorepo / 依賴 | **尚未建立**，本階段禁止新增 |
| 技術棧 | ADR 0001 已鎖定，本 GDD 不改框架 |
| Phaser | 不進入核心棧 |
| Redis | 不是主庫 |
| GDD 原稿時間常數 | `timeScale=60`、`maxOfflineGameSec=86400`、`tickIntervalRealMs=5000`（86400＝日長，**不入帳**） |
| 入帳離線上限 | 系統定義：8 現實小時（`maxOfflineRealSec=28800`） |

## 專案

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

## 核心精神

- 資料驅動：物品、規則、方式、層級、解鎖都是資料。
- 規則自動生成生產方式：`production_methods` 不是手寫第二套配方。
- 規則可繼承、組合、覆寫（R-INH1～6）。
- 驗證器把關層級、依賴、循環、解鎖、公式、繼承深度。
- 每筆可發布資料帶 `released_in_version`、`is_active`。
- 不跳級；層級與繼承圖是 DAG，禁止循環。
- **時間組件式可配**：工時、倍率、層級帶是資料（見 [0003 §3.5](0003-tiers-and-types.md)），不是引擎寫死的數值表。
- 可配置、可觀測。

## 可擴充原則（必須可執行）

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

## 引擎只做這些，不做那些

| 做 | 不做 |
| --- | --- |
| 讀規則與類型 | 改規則內容、改類型定義 |
| 依規則生成方式與迴圈 | 為單一物品寫死生產函數 |
| 驗證後才讓資料生效 | 跳過驗證器上線 |
| 依真實時間差懶結算 | 對每座建築每遊戲秒跑迴圈 |
| 伺服器入帳 | 讓客戶端寫回權威庫存 |

## 分層一句話

物質層 T 與產物層 P。T 不可由 P 製成；P 升層一次只升一級且必須含上一級 P。細則：[0003](0003-tiers-and-types.md)。

## 時間一句話

`timeScale = 60`：1 真實秒 = 60 遊戲秒 = 1 遊戲分鐘。GDD 原稿 `maxOfflineGameSec=86400`（1 遊戲日＝24 真實分鐘，**日長／原稿紀錄**）。入帳上限 **8 現實小時**（`maxOfflineRealSec=28800`，衍生 1,728,000 遊戲秒）。`tickIntervalRealMs = 5000`。實體同時存真實 `lastSettledAt` 與遊戲 `last_settled_game`；結算用真實差 × 60。不存「現在的遊戲時間」。細則：[0002](0002-time-and-settlement.md)。

## 名稱對齊

| 說法 | 意思 |
| --- | --- |
| NestJS 模組 `catalog` / `rules` / `simulation` / `inventory` / `realtime` / `jobs` | 部署與 DI 邊界。`realtime`／`jobs` 為目標棧；MVP 可不掛載 |
| GDD `GameClock`、`Settlement`、`FormulaEngine`… | 純計算物件，放進 `simulation` 或 `rules`，不開 HTTP |
| 禁止 | 再建一個 NestJS 模組叫 `core` |

完整表：[architecture/overview.md](../architecture/overview.md)、[0001-module-boundaries.md](../architecture/0001-module-boundaries.md)。

## 三層內容（禁止壓成一層）

| 層 | 系統 | 物品 | 法源 |
| --- | --- | --- | --- |
| 工程 MVP | 農業 1 | 5–10 | [mvp.md](../mvp.md) |
| 目標首發 | ≥5：農、礦、化工、通用、能源；物流可選 | 50–100 | 全文 §13 + 系統定義 §2 |
| 長期 | 資料擴充 | 不設引擎頂 | [../roadmap.md](../roadmap.md) |

## 首發範圍（摘要）＝目標首發，不是工程 MVP

農業 + 礦業 + 基礎化工 + 通用。能源為核心循環約束。物流可選。T2 同位素關閉。細則：[0007](0007-scope-expansion.md)。工程 MVP 見 [mvp.md](../mvp.md)。

---

## 相關文件

| 文件 | 職責 |
| --- | --- |
| [GDD v2.0 §1／§17](production-system-v2.md#1-概述) | 概述與文件狀態全文 |
| [ADR 0001](../adr/0001-tech-stack.md) | 技術棧 |
| [ADR 0003](../adr/0003-production-rules.md) | 規則作為架構閘門 |
| [0002](0002-time-and-settlement.md) | 時間系統 |
| [0007](0007-scope-expansion.md) | 首發與擴展 |
