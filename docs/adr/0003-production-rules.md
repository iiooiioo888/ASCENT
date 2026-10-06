# ADR 0003：生產規則作為架構約束

| 項 | 值 |
| --- | --- |
| 編號 | 0003 |
| 狀態 | **已接受**（2026-10-06） |
| 規則法源 | [GDD v2.0 正式全文](../gdd/production-system-v2.md)（節 1–17） |
| 技術棧 | [ADR 0001](0001-tech-stack.md)（本檔**不改**定案表） |
| 產品邊界 | [ADR 0002](0002-product-constraints.md)（本檔**不改**） |
| 編號說明 | **不**另開 `0002-production-rules.md`：0002 已用於產品約束。見 [ADR 索引](README.md) |

## 狀態

已接受。本決策把 GDD v2.0 的規則與驗證清單定為**開工閘門**。不重複貼完整 GDD、不另寫第二套 SQL／JSON 範例、不改 1:60、不改 NestJS 模組邊界。

## 背景

引擎只認識規則與類型。若實作為單一物品寫死函數、手寫孤兒 `production_methods`、跳過驗證器、或再建 NestJS 模組名叫 `core`，GDD 會變成裝飾。需要一份短 ADR 鎖定「開工時不准做什麼」。細則仍以 GDD 全文為準。

## 決策

### 閘門總表

| 約束域 | 定案 | 細則法源 |
| --- | --- | --- |
| 引擎 | 只讀規則與類型，**永不修改** | GDD §1 |
| 時間 | 算出來、不存「現在」；懶結算；不對每座建築每遊戲秒跑迴圈 | GDD §2、ADR 0001 |
| 層級 | T／P 遵守 R-T1～R-T3、R-P1～R-P4；`derived_tier` 自動推導 | GDD §3 |
| 類型 | `item_types`／`item_properties`／`items`；類型**不**編碼 T／P | GDD §4 |
| 方式 | 只由 `MethodGenerator` 從已驗證規則生成；禁止孤兒 | GDD §5 |
| 規則 | `production_rules` 是唯一配方語意來源 | GDD §6 |
| 公式 | 僅白名單變數與運算；未知名失敗 | GDD §7 |
| 繼承 | R-INH1～R-INH5；R-INH6 深度 ≤ 10；單親 DAG | GDD §8 |
| 優化維度 | `duration`、`yield`、`energy`、`input_factor`、`byproduct`、`level`（資料，非引擎寫死） | GDD §9 |
| Schema | 語意聽 GDD SQL；**實作 Prisma → PostgreSQL**；JSONB + GIN | GDD §10、ADR 0001 |
| 入帳 | 唯一入口在 `inventory`；`lastSettledAt` + 懶結算 | GDD §2／§11、ADR 0001 |
| 驗證 | 第 15 節清單**全過**才可啟用資料 | GDD §15 |
| 變更 | L1／L2 不改引擎；L3／L4 常需 ADR | GDD §16 |

驗證失敗的規則不得生成方式，不得被建築選用。不跳級；繼承與層級依賴為 DAG。

### 層級閘門（摘要，不取代 GDD §3）

| ID | 開工時必須守 |
| --- | --- |
| R-T1 | 產出為 T 的規則，輸入不得含 P |
| R-T2 | 產出 T(n) 的規則，T 輸入只能是 T(≤n) |
| R-T3 | T 可作任何規則的輸入（含產出為 P） |
| R-P1 | P1 可全是 T；P(n)（n≥2）至少一個 P(n-1) |
| R-P2 | P 規則可含 T 作為輔助輸入 |
| R-P3 | P 不可作 T 的輸入（與 R-T1 雙邊檢） |
| R-P4 | P 一次只升一級；禁止 +2 |

T2 同位素目標首發 `is_active=false`。手填 `derived_tier` 與推導不一致 → 驗證失敗。

### 繼承閘門（摘要，不取代 GDD §8）

| ID | 開工時必須守 |
| --- | --- |
| R-INH1 | 單親；繼承圖 DAG，禁止循環 |
| R-INH2 | 未覆寫欄位等於父（遞迴到根） |
| R-INH3 | 只覆寫聲明欄位；合併後必須通過驗證器 |
| R-INH4 | 組合用集合，**不用多親欄位合併** |
| R-INH5 | 父關閉或未到版本時，子不得單獨生效 |
| R-INH6 | 深度上限 **10**（根為 0；邊數 ≤ 10） |

### 公式閘門（摘要，不取代 GDD §7）

允許：`+` `-` `*` `/`；`min` `max` `floor` `ceil` `round` `if(cond, a, b)`。  
變數前綴：`item.`、`parent.`、`input.`、`base`、`tier`、`level`。  
禁止：自訂函數、迴圈、指派、未聲明變數、除以常數 0。

### 驗證閘門（V-*）

開工合併前，下列代碼必須可跑且全過。檢查文案聽 GDD §15，本檔不另寫第二套定義。

`V-SKIP`、`V-DOWN`、`V-T-P`、`V-CYCLE`、`V-ID`、`V-OUT`、`V-TIME`、`V-TIER`、`V-INH`、`V-FORMULA`、`V-METHOD`、`V-OFFLINE`、`V-ACTIVE`。

`V-OFFLINE`：入帳 cap 聽系統定義（`maxOfflineRealSec=28800`）。用 GDD 原稿 `86400`／`1440` 裁切產能 **失敗**。原稿 `maxOfflineGameSec=86400` 必須留在 GDD 當日長，不得從 GDD 刪除。

### Schema 與 Prisma（對齊，不改 GDD 規則）

GDD SQL 是設計約定，不是遷移腳本。實作：

- Prisma 對應 PostgreSQL；可變 `properties`／公式／隊列用 JSONB + GIN。
- 可結算實體同時存真實 `lastSettledAt` 與遊戲 `last_settled_game`；入帳只用真實差 × 60。
- `server_state`（世界錨點）與 `game_config`（時間常數）語意分開；Prisma 可合成單列，欄位不得消失。
- `game_config.game_day_game_sec=86400` 為日長語意欄，**不得當入帳 cap**。

GDD `core/` 是純計算物件名。NestJS 模組是 `catalog`／`rules`／`simulation`／`inventory`／`realtime`／`jobs`。**禁止再建模組叫 `core`。**

### 變更控制 L1–L4

| 層 | 改什麼 | 改引擎？ |
| --- | --- | --- |
| L1 | 物品、規則數字、旗標 | 否 |
| L2 | 新類型、新產業包 | 否（驗證器仍須過） |
| L3 | 新優化維度、新白名單函數、新驗證條款 | 是（小；常改本 ADR） |
| L4 | 新結算模型、市場、推送、渲染層 | 是（大；常需另開 ADR） |

改 1:60、改主庫、把 Phaser 納入核心、以 Fastify 當核心、以 Redis 當主庫、每 tick 全量模擬 → 走 **ADR 0001 取代程序**，不走本檔。

## 後果

- 新增作物／礦種／鐵錠變體走 L1 資料，不改引擎。
- 新增產業包走 L2 + 完整驗證。
- 新白名單函數或新驗證條款走 L3，且常需改本 ADR。
- 玩家操作、進頁、cron、BullMQ 必須走 `inventory` 同一結算入口。
- 本決策不產生程式目錄、不安裝依賴。

## 相關文件

| 文件 | 職責 |
| --- | --- |
| [ADR 索引](README.md) | 編號約定 |
| [GDD v2.0](../gdd/production-system-v2.md) | 規則全文（節 1–17） |
| [生產系統正式設計](../production-system.md) | 規則濃縮契約 |
| [ADR 0001](0001-tech-stack.md) | 技術棧與 1:60 |
| [ADR 0002](0002-product-constraints.md) | 產品約束 |
| [architecture/overview.md](../architecture/overview.md) | 模組對照 |
| [time-and-settlement.md](../architecture/time-and-settlement.md) | 懶結算契約 |
| [api/v1.md](../api/v1.md) | 端點表 |
