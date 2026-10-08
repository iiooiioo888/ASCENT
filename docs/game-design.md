# 《帝國掘起》遊戲設計總覽

| 項 | 值 |
| --- | --- |
| 版本 | 2026-10-06 |
| 狀態 | 設計入口；**不是**第二份 GDD |

生產規則全文：[gdd/production-system-v2.md](gdd/production-system-v2.md)（v2.0 節 1–17）；濃縮：[production-system.md](production-system.md)；分冊見 [gdd/README.md](gdd/README.md)。產品、優先級、MVP、分階段技術在 [系統定義 v1.0](system-definition.md)。

工程 MVP 程式在倉庫 `apps/` 與 `packages/shared`；本檔仍只當設計入口。玩家做：**建造 + 管理 + 競爭 + 探索**（競爭非 MVP）。

## 核心精神

| 原則 | 含義 |
| --- | --- |
| 無限發展 | 無勝利條件 |
| 生產鏈深度優先 | 規則、層級、方式、迴圈比視覺與社交重要 |
| 引擎不改規則 | 只認識規則與類型；變更走資料與驗證器 |
| 資料驅動 | 方式由規則生成，禁止孤兒 `production_methods` |
| 不跳級、DAG | T／P 層級與繼承禁止循環、禁止一次跳多級 |
| 伺服器權威 | 1:60 懶結算、冪等、離線上限 **8 現實小時** |

## 三層內容（不要混）

| 層 | 系統 | 物品 | 備註 |
| --- | --- | --- | --- |
| 工程 MVP | 農業 | 5–10（切片鎖定 8） | [mvp.md](mvp.md)、[目錄](gdd/mvp-agriculture-catalog.md) |
| 可玩擴充 | 礦、化、工、能源、林木 | 農業切片之外另 30 項 | [產業擴充目錄](gdd/industry-expansion-catalog.md) |
| 目標首發 | ≥5（農、礦、化工、通用、能源；物流可選） | 50–100 | GDD 0005 + 系統定義 §2 |
| 長期 | 資料擴充 | 不設引擎頂 | [roadmap.md](roadmap.md) |

## 時間（一句）

`gameTime = startGameTime + (now - startRealTime) / 1000 × 60`  
離線上限 **8 現實小時**（`maxOfflineRealSec=28800`，`maxOfflineGameSec=1728000`，20 遊戲日）。無加速。細則：[gdd/0002-time-and-settlement.md](gdd/0002-time-and-settlement.md)。

## 繼續往下讀

1. [系統定義 v1.0](system-definition.md)
2. [生產系統 GDD v2.0 正式全文](gdd/production-system-v2.md)
3. [ADR 0001 技術棧](adr/0001-tech-stack.md)（含分期落地）
4. [GDD 0001 概述](gdd/0001-overview.md)

核心循環之後的資源出口（**不在 MVP**，現階段只定義）：[AI 訂單](gdd/ai-orders.md)。
