# 生產系統 GDD v2.0

本目錄是《帝國掘起》遊戲設計文件 **v2.0 的落地**（生產系統）。

| 檔 | 角色 |
| --- | --- |
| **[production-system-v2.md](production-system-v2.md)** | **正式全文**（節 1–17，含 SQL 與範例 JSON） |
| [production-system.md](production-system.md) | 節次入口與核心規則速覽，**不是**第二套全文 |
| [0001](0001-overview.md)～[0007](0007-scope-expansion.md) | 與全文同義拆讀 |
| [launch-scope.md](launch-scope.md) | 目標首發範圍、統計、改版節奏（不另寫規則） |
| [mvp-agriculture-catalog.md](mvp-agriculture-catalog.md) | 工程 MVP 農業切片 ID／驗證對照（非整數值） |
| [industry-expansion-catalog.md](industry-expansion-catalog.md) | 可玩產業擴充（不改農業切片槽位） |
| [../production-system.md](../production-system.md) | 規則濃縮契約，不是第二套 GDD |

禁止把節次入口再寫成一份規則正文。衝突時：

- 產品範圍／**入帳**離線 **8 現實小時** → [系統定義 v1.0](../system-definition.md) §2、§5
- 規則、T／P、公式、繼承、Schema 語意、驗證、SQL／JSON → [production-system-v2.md](production-system-v2.md)
- 欄位級對照 → [0005](0005-schema-and-api.md)
- 時間步驟與兩層數字 → [0002](0002-time-and-settlement.md) · [架構結算契約](../architecture/time-and-settlement.md)
- 與分冊打架時以**全文**為準；**入帳時間除外**（入帳聽系統定義 §5 = 0002）
- 技術棧 → [ADR 0001](../adr/0001-tech-stack.md)
- 規則作為架構約束 → [ADR 0003](../adr/0003-production-rules.md)（編號 0002 已用於產品約束，**不**另建 `0002-production-rules.md`）
- 目標首發展開 → [launch-scope.md](launch-scope.md)
- 工程 MVP → [mvp.md](../mvp.md)
- 農業切片 ID／驗證對照 → [mvp-agriculture-catalog.md](mvp-agriculture-catalog.md)
- AI 訂單（不在 MVP）→ [ai-orders.md](ai-orders.md)

## 節 1–17 對照

標題短名穩定錨點；覆蓋範圍與全文目錄相同。

| 節 | 題 | 覆蓋 | 檔 |
| --- | --- | --- | --- |
| 1 | 概述 | 模擬經營／生產鏈、網頁、1:60、遊戲 1 天＝24 現實分鐘、首發農礦化工通用 | [全文](production-system-v2.md#1-概述) · [0001](0001-overview.md) |
| 2 | 時間 | 算出來不存下來、gameTime、game_config、儲存規則、GET /time | [全文](production-system-v2.md#2-時間系統) · [0002](0002-time-and-settlement.md) |
| 3 | 分層 | T／P、R-T1～R-T3、R-P1～R-P4、層級自動推導、時間／成本倍率 | [全文](production-system-v2.md#3-分層) · [0003](0003-tiers-and-types.md) |
| 4 | 類型屬性 | `item_types`、`item_properties`、`items` | [全文](production-system-v2.md#4-類型與屬性) · [0003](0003-tiers-and-types.md) |
| 5 | 生產方式 | `production_methods`、鐵錠三種方式 | [全文](production-system-v2.md#5-生產方式) · [0004](0004-rules-and-methods.md) |
| 6 | 規則 | `production_rules`、繼承欄位、自動生成方式 | [全文](production-system-v2.md#6-規則) · [0004](0004-rules-and-methods.md) |
| 7 | 公式 | 白名單變數與運算 | [全文](production-system-v2.md#7-公式) · [0004](0004-rules-and-methods.md) |
| 8 | 繼承 | R-INH1～R-INH5（另含 R-INH6） | [全文](production-system-v2.md#8-繼承) · [0004](0004-rules-and-methods.md) |
| 9 | 優化 | 優化維度與目標 | [全文](production-system-v2.md#9-優化) · [0004](0004-rules-and-methods.md) |
| 10 | Schema | 完整 DB schema（含 SQL） | [全文](production-system-v2.md#10-schema) · [0005](0005-schema-and-api.md) |
| 11 | 引擎 | GameClock／FormulaEngine／RuleEngine／MethodGenerator／LoopGenerator／Validator／Settlement／Production | [全文](production-system-v2.md#11-核心引擎模組) · [0006](0006-engine.md) |
| 12 | API | 端點表（含 JSON） | [全文](production-system-v2.md#12-api) · [0005](0005-schema-and-api.md) · [../api/v1.md](../api/v1.md) |
| 13 | 首發範圍 | 首發範圍與核心循環 | [全文](production-system-v2.md#13-首發範圍) · [0007](0007-scope-expansion.md) · [launch-scope.md](launch-scope.md) |
| 14 | 擴展 | 擴展策略 | [全文](production-system-v2.md#14-擴展) · [0007](0007-scope-expansion.md) |
| 15 | 驗證清單 | V-* 全過才可啟用 | [全文](production-system-v2.md#15-驗證清單) · [0005](0005-schema-and-api.md) |
| 16 | 可擴展性 | L1–L4 | [全文](production-system-v2.md#16-可擴展性) · [0007](0007-scope-expansion.md) |
| 17 | 文件狀態 | v2.0 **確定** | [全文](production-system-v2.md#17-文件狀態) · [0001](0001-overview.md) |

## 鎖定時間常數

| 層 | 鍵 | 值 |
| --- | --- | --- |
| GDD 原稿 | `timeScale` | `60` |
| GDD 原稿 | `maxOfflineGameSec` | `86400`（1 遊戲日；**不入帳**） |
| GDD 原稿 | `tickIntervalRealMs` | `5000` |
| 實作日長 | `gameDayGameSec` | `86400` |
| 產品入帳 | `maxOfflineRealSec` | `28800`（**8 現實小時**） |
| 產品入帳衍生 | `Config.maxOfflineGameSec` | `1728000` |

```
gameTime = startGameTime + (now - startRealTime) / 1000 × timeScale
```

**1 真實秒 = 60 遊戲秒 = 1 遊戲分鐘。遊戲 1 天 = 24 真實分鐘。** 時間算出來、不存「現在」；懶結算；不對每座建築每遊戲秒跑迴圈。86400 **必須出現在 GDD**（日長／原稿），**不得**當入帳 cap。
