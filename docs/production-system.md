# 《帝國掘起》生產系統設計

| 項 | 值 |
| --- | --- |
| 版本 | v1.0 |
| 狀態 | **確定**（基礎套件正式設計；規則濃縮契約） |
| 日期 | 2026-10-06 |
| 產品法源 | [系統定義 v1.0](system-definition.md) |
| 技術法源 | [ADR 0001](adr/0001-tech-stack.md) |
| 架構約束 | [ADR 0003](adr/0003-production-rules.md) |
| 欄位級正文 | [gdd/README.md](gdd/README.md)（0001–0007） |
| GDD 正式全文 | [gdd/production-system-v2.md](gdd/production-system-v2.md)（節 1–17）；[節次入口](gdd/production-system.md) 不是第二套全文 |
| 工程切片 | [mvp.md](mvp.md) |
| 本階段 | 只寫文件；不建碼、不安裝依賴、不寫 Prisma／API 程式 |

本檔是基礎文件套件的**正式生產設計**：規則驅動、物質層 T／產物層 P、公式、繼承、驗證、方式由規則自動生成。精簡但不另開第二套規則。Schema／SQL／API 以 [GDD 0005](gdd/0005-schema-and-api.md) 與 [api/v1.md](api/v1.md) 為準。時間步驟以 [GDD 0002](gdd/0002-time-and-settlement.md) 為準。

衝突時：離線入帳上限聽系統定義 §5；框架聽 ADR 0001；規則與驗證聽本檔與 GDD（欄位級對照分冊；與分冊打架時以 [GDD 全文](gdd/production-system-v2.md) 為準；入帳時間除外）。禁止在本檔與 GDD 寫不同的 `timeScale` 或兩套入帳 cap。

---

## 1. 引擎原則

引擎只認識**規則**與**類型**，**永不修改**它們。變更走資料 + 驗證器。資料驅動。

| 做 | 不做 |
| --- | --- |
| 讀規則與類型 | 改規則內容、改類型定義 |
| 依規則生成生產方式與產業迴圈 | 為單一物品寫死生產函數；手寫孤兒 `production_methods` |
| 驗證通過後資料才生效 | 跳過驗證器上線 |
| 依真實時間差懶結算 | 對每座建築每遊戲秒跑迴圈 |
| 伺服器入帳 | 讓客戶端寫回權威庫存 |

- 不跳級；層級與繼承圖是 **DAG**，禁止循環。
- 繼承深度上限 **10**（R-INH6）。
- GDD `core/` 是純計算物件名，禁止再建模組名叫 `core`。

---

## 2. 時間與懶結算

時間算出來，不持久化「當前遊戲時間」。**無加速。** `timeScale = 60`。不對每座建築每遊戲秒跑迴圈。

```
gameTime = startGameTime + (now - startRealTime) / 1000 × timeScale
```

`now` 與 `startRealTime` 為 Unix 毫秒。

| 現實 | 遊戲 |
| --- | --- |
| 1 秒 | 60 秒 = 1 分鐘 |
| 1 分鐘 | 1 小時 |
| 1 小時 | 60 小時 |
| 24 分鐘 | 1 遊戲日 = **86400 遊戲秒**（日長，不是入帳上限） |
| 1 日 | 60 日 |
| **8 小時** | **480 遊戲小時 = 1,728,000 遊戲秒 = 20 遊戲日**（入帳上限） |

| 鍵 | 值 | 角色 |
| --- | --- | --- |
| `timeScale` | `60` | 寫死；1 真實秒 = 60 遊戲秒 |
| `maxOfflineRealSec` | `28800` | **8 現實小時**；入帳權威 cap |
| `maxOfflineGameSec` | `1728000` | `28800 × 60` = **20 遊戲日**（衍生） |
| `tickIntervalRealMs` | `5000` | 粗粒度 tick；不是遊戲秒迴圈 |
| GDD 原稿 `maxOfflineGameSec=86400` | 1 遊戲日 | **必須留在 GDD**；**不得入帳** |

權威游標：`lastSettledAt`（真實時間）。遊戲快照：`last_settled_game`（不得單獨入帳）。實體必須同時保存。

```
cappedRealDeltaSec = min(rawRealDeltaSec, 28800)
gameDeltaSec       = cappedRealDeltaSec × 60
```

寫入成功後 `lastSettledAt = nowReal`。上限外產能為 0，該區間關閉，不得再補產。顯示用 `gameTime` 不因上限凍結。

原稿「8 小時現實時間 = 28,800 遊戲秒 = 遊戲內 8 小時」與 1:60 矛盾，**廢棄**。正確讀法：8 現實小時 = 28,800 **現實秒** × 60 = 1,728,000 **遊戲秒**。

**MVP：** 進頁／操作時懶結算；可選 NestJS cron 呼叫與 `inventory` 同一入口。**不強依 Redis。** 目標期才用 BullMQ tick。細則：[GDD 0002](gdd/0002-time-and-settlement.md)、[ADR 0001](adr/0001-tech-stack.md)。

---

## 3. 物質層 T vs 產物層 P

| 層 | 代碼 | 含義 |
| --- | --- | --- |
| 物質層 | `T` | 原料、中間物質 |
| 產物層 | `P` | 加工產物 |

不跳級、不循環、DAG。T 不依賴 P。層寫在 `items.layer`；層級 `n` 由規則輸入自動推導，快取在 `items.derived_tier`。

| ID | 規則 |
| --- | --- |
| T1 | 開採／提取（無物品輸入 → `derived_tier = 1`） |
| T2 | 同位素**首發關閉**（`is_active=false`） |
| R-T1 | 產出為 T 的規則，輸入不得含 P |
| R-T2 | 產出 T(n) 的規則，T 輸入只能是 T(≤n) |
| R-T3 | T 可作任何規則的輸入（含產出為 P） |
| R-P1 | P1 **僅 T**。P(n)（n≥2）至少 1 個 P(n-1) |
| R-P2 | P 規則可含 T 作為輔助輸入 |
| R-P3 | P 不可作 T 的輸入（與 R-T1 雙邊檢） |
| R-P4 | P 一次只升一級：`n = max(P 輸入層級) + 1` |

細則與工時帶：[GDD 0003](gdd/0003-tiers-and-types.md)。

---

## 4. 物品 = 類型 + 屬性

類型**不**編碼 T／P。三張目錄表：

| 表 | 職責 |
| --- | --- |
| `item_types` | 類型（作物、礦石、中間體…） |
| `item_properties` | 屬性定義（純度、含水、熱值…） |
| `items` | 具體物品：一個類型 + 一組屬性值；含 `layer`、`derived_tier`、JSONB `properties` |

目標首發：稀有度 4–5 級、品質連續 0–100%。MVP 可省略這兩欄。不得為稀有度／品質再發明一套與 T／P 平行的層級。

---

## 5. 規則自動生成生產方式

兩張表，一個方向：

| 表 | 誰寫 | 誰讀 |
| --- | --- | --- |
| `production_rules` | 設計資料 | `RuleEngine`、`Validator`、`MethodGenerator` |
| `production_methods` | **只由** `MethodGenerator` 從已驗證規則生成 | 建築開工、結算、UI |

每筆方式必須有 `rule_id`。禁止孤兒。方式種類**無引擎硬頂**；建築開工隊列**有限制**。

| 對象 | 決策 | MVP |
| --- | --- | --- |
| 切換 | 可切換，**有成本**。先結算當前 → 扣成本 → 再套用新方式 | 可先不做切換 |
| 循環 | **半自動**（核心產業迴圈可跑） | 開工後依時間產出、進頁收取即可 |
| 隊列 | 建築／玩家側開工隊列有上限 | 可鎖成很小常數（例如 1） |

`LoopGenerator` 在已生成方式上標出核心循環（農業／礦業／化工／通用／能源）。物品互為輸入輸出可以成**產業迴圈**；規則繼承、層級依賴、公式參照仍禁止循環。

優化維度（來自規則資料，不是引擎寫死）：`duration`、`yield`、`energy`、`input_factor`、`byproduct`、`level`。

解析順序：根 → 子覆寫 → 驗證器 → `MethodGenerator`。細則：[GDD 0004](gdd/0004-rules-and-methods.md)。

---

## 6. 繼承（R-INH1～6）

| ID | 規則 |
| --- | --- |
| R-INH1 | 單親；繼承圖必須是 DAG，禁止循環 |
| R-INH2 | 未覆寫的欄位等於父（遞迴到根） |
| R-INH3 | 只覆寫聲明欄位；合併後必須通過驗證器 |
| R-INH4 | 組合用集合（全部通過才合法），**不用多親欄位合併** |
| R-INH5 | 父關閉或未到版本時，子不得單獨生效 |
| R-INH6 | **深度上限 10**（根為深度 0；邊數 ≤ 10） |

---

## 7. 公式白名單

只允許下列運算與函數，其餘一律驗證失敗：

| 類 | 允許 |
| --- | --- |
| 運算 | `+` `-` `*` `/` |
| 函數 | `min` `max` `floor` `ceil` `round` `if` |
| `if` | `if(cond, a, b)`；`cond` 為 `>` `<` `>=` `<=` `==` `!=` |

禁止：自訂函數、迴圈、指派、未聲明變數、除以常數 0。求值時除數為 0 → 該次驗證／結算失敗，不寫庫。

| 前綴 | 含義 |
| --- | --- |
| `item.X` | 主體／產出物品屬性 |
| `parent.X` | 繼承解析後，父規則的公式或欄位 |
| `input.X` | 具名輸入的數量或屬性 |
| `base` | 規則基準常數（基準工時） |
| `tier` | 產出物品的 `derived_tier` |
| `level` | 建築或方式等級（沒有則 0） |

耗時必須為正整數（**遊戲秒**）。`formulas.duration` 若存在則用求值結果，否則 `duration_game_sec`。

---

## 8. 建築

| 項 | 目標 | MVP |
| --- | --- | --- |
| 等級 | 可升級 | 不做 |
| 專精 | 可專精；**分支不可逆** | 不做 |
| 耐久 | 只影響效率；隨時間下降；**不歸零**；建築不因耐久消失或停死 | 不做 |
| 佔地 | 有佔地，可擴張 | 不做 |
| 相鄰 | 同類、互補加成 | 不做 |
| 放置／開工／收取 | 要 | **要**（3–5 座） |

建築必須持有 `lastSettledAt`。專精、耐久、相鄰不在 MVP。

---

## 9. 驗證清單

任一來失敗：該規則／方式不得進 `is_active` 生效集。全文：[GDD 0005](gdd/0005-schema-and-api.md)。

| 代碼 | 檢查 |
| --- | --- |
| V-SKIP | 不跳級：P 一次 +1；T 升層最多 +1；未解鎖層／物品不得當輸入或產出 |
| V-DOWN | 不降級 |
| V-T-P | T 不依賴 P（R-T1／R-P3） |
| V-CYCLE | 無循環：繼承、層級、公式參照皆為 DAG |
| V-ID | 所有 ID 存在 |
| V-OUT | 每條規則至少一個輸出 |
| V-TIME | 耗時為正整數遊戲秒 |
| V-TIER | 層級自動推導與 `derived_tier` 一致 |
| V-INH | R-INH1～6（含深度 ≤ 10） |
| V-FORMULA | 僅白名單、可解析 |
| V-METHOD | 已啟用方式皆有已啟用 `rule_id`；禁止孤兒 |
| V-OFFLINE | 入帳 `maxOfflineRealSec=28800`、`Config.maxOfflineGameSec=1728000`。用 `86400`／`1440` 當 cap **失敗** |
| V-ACTIVE | `is_active` 與 `released_in_version`（含 T2 同位素關閉） |

---

## 10. 首發內容統計（完整版目標，不是工程 MVP）

下列數字是**目標首發設計統計**，不是引擎硬頂，也不是工程 MVP。MVP 只做農業 5–10 物品。來源：[GDD 0007](gdd/0007-scope-expansion.md)。

| 項 | 目標首發 | 工程 MVP |
| --- | --- | --- |
| 系統 | ≥5：農、礦、化工、通用、能源；物流可選 | 農業 1 |
| 物品 | 50–100（統計例：T1 25／T2 8 關／P1 17／P2 13／P3 6，合計 69） | 5–10 |
| 建築 | 完整能力（統計例：32 定義） | 3–5 |
| 規則／方式 | 規則生成、無硬頂（統計例：8 規則 → 約 50 方式） | 5–10 方式，皆有 `rule_id` |
| T2 同位素 | **關** | **關** |
| 稀有度／品質 | 4–5 級；0–100% | 可省略 |

---

## 11. 純計算 vs NestJS

禁止再建模組叫 `core`。展開：[architecture.md](architecture.md)、[GDD 0006](gdd/0006-engine.md)。

| GDD 純計算 | NestJS 模組 | MVP |
| --- | --- | --- |
| `GameClock`、`Config`、`Settlement` | `simulation`（不碰 HTTP／DB／WS） | 要 |
| `FormulaEngine`、`RuleEngine`、`MethodGenerator`、`LoopGenerator`、`Validator` | `rules` | 要（迴圈可簡化） |
| `systems.Inventory`／`Production`／`Building` | `inventory`（唯一入帳） | 要 |
| 推送 | `realtime`（Socket.IO） | **關** |
| 離線補算與 tick | `jobs`（BullMQ） | **關**；可選 NestJS cron 呼叫同一入口 |

目標棧（ADR 0001 定案，不刪）：NestJS + PostgreSQL + Prisma + Redis + BullMQ + Socket.IO。MVP 技術切片：NestJS + PostgreSQL + Prisma + HTTP。

---

## 12. 文件職責與下一步

| 問題 | 聽誰的 |
| --- | --- |
| 產品、優先級、MVP 範圍、離線 8 現實小時 | [系統定義](system-definition.md) |
| 框架、目標 Redis／Socket.IO、否決 Fastify | [ADR 0001](adr/0001-tech-stack.md) |
| 本檔未列的欄位、SQL、API | [GDD 0005](gdd/0005-schema-and-api.md)、[api/v1.md](api/v1.md) |
| 工程 MVP 驗收 | [mvp.md](mvp.md) |

下一步仍是**文件層面完善**。本階段只有設計文件。農業切片槽位：[gdd/mvp-agriculture-catalog.md](gdd/mvp-agriculture-catalog.md)。不是開工寫程式。

**實作順序**（文件齊一之後才開工；本次不實作）：

1. 生產鏈核心 → 2. 數值平衡 → 3. 離線結算 → 4. 存檔 → 5. 視覺 → 6. 玩家互動
