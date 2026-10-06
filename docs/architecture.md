# 《崗起》架構

| 項 | 值 |
| --- | --- |
| 版本 | 2026-10-06 |
| 狀態 | **確定**（架構契約；不建模組骨架） |
| 法源 | [ADR 0001](adr/0001-tech-stack.md) |
| 規則 | [GDD v2.0 正式全文](gdd/production-system-v2.md)；分冊 [gdd/README.md](gdd/README.md) |
| 展開 | [overview.md](architecture/overview.md)、[time-and-settlement.md](architecture/time-and-settlement.md)、[0001-module-boundaries.md](architecture/0001-module-boundaries.md) |
| 本階段 | 只寫文件，不建模組骨架 |

GDD `core/` 是純計算物件名。NestJS 模組是部署與 DI 邊界。**禁止再建模組叫 `core`。**

之後開工建議（現在不要建立）：`apps/web`、`apps/api`、`packages/shared`。`packages/shared` 不得依賴 Prisma、Socket.IO 或 Redis 客戶端。權威寫入只留在 `apps/api`。

---

## 1. 模組邊界

定案模組：`catalog`、`rules`、`simulation`、`inventory`、`realtime`、`jobs`，另加 `PrismaModule`。

| 模組 | 職責 | HTTP | DB 寫 | WS | 結算 |
| --- | --- | --- | --- | --- | --- |
| `catalog` | 物品、類型、屬性 | 讀 | 否 | 否 | 否 |
| `rules` | 公式、生成、驗證 | GET + `POST /validate` | 不寫庫存 | 否 | 否 |
| `simulation` | Config、時鐘、懶結算純函數 | **否** | **否** | **否** | 本身 |
| `inventory` | **唯一入帳**；`GET /api/v1/time` | 是 | 是 | 否 | 呼叫 `simulation` |
| `realtime` | 只推已提交結果（Socket.IO） | 否 | 否 | 是（目標） | 否 |
| `jobs` | BullMQ tick／離線補算 | 否 | 同一入口 | 否 | 同一入口 |
| `PrismaModule` | Prisma | 否 | 供他模 | 否 | 否 |

```
catalog ← rules ← simulation ← inventory
                              ← jobs
realtime  ← 只收已提交 DTO
```

`simulation` 不依賴 Prisma／Socket.IO／Redis，不讀 `Date.now()`。`nowReal` 由呼叫端注入。

GDD 純計算對應：`GameClock`／`Config`／`Settlement` → `simulation`；`FormulaEngine`／`RuleEngine`／`MethodGenerator`／`LoopGenerator`／`Validator` → `rules`；`systems.Inventory`／`Production`／`Building` → `inventory`。

MVP：`catalog`／`rules`／`simulation`／`inventory` 要有；`realtime` 與 `jobs` 可不掛載。可選 NestJS cron 必須呼叫與 `inventory` **同一**結算入口。

---

## 2. 懶結算契約

時間是**算出來的**，不是存下來的。不持久化「當前遊戲時間」。**不對每座建築每遊戲秒跑迴圈。**

```
gameTime = startGameTime + (now - startRealTime) / 1000 × timeScale
```

`now` 與 `startRealTime` 為 Unix 毫秒。`timeScale=60`。

**1 真實秒 = 60 遊戲秒 = 1 遊戲分鐘。遊戲 1 天 = 24 真實分鐘 = 86400 遊戲秒。**

GDD v2.0 原稿三常數必須寫進 GDD：`timeScale=60`、`maxOfflineGameSec=86400`（**日長／原稿**，不得入帳）、`tickIntervalRealMs=5000`。

懶結算渠道（與 GDD 對齊）：

| 時機 | 目標棧 | MVP |
| --- | --- | --- |
| 讀取或操作該實體 | 要 | **要** |
| BullMQ 粗粒度 tick（`tickIntervalRealMs=5000`） | `jobs` | 可選 NestJS 定時器；可不啟 |
| 上線／進頁離線補算 | 要 | 無登入時以進頁 GET 代替 |

```
rawRealDeltaSec    = max(0, nowReal - lastSettledAt)
cappedRealDeltaSec = min(rawRealDeltaSec, maxOfflineRealSec)  // 28800 現實秒
gameDeltaSec       = cappedRealDeltaSec × 60                  // 上限 1,728,000
```

純函數：同輸入同結果。內部不讀系統時鐘、不寫庫、不發網。

---

## 3. 伺服器權威

伺服器是唯一權威。PostgreSQL 是權威儲存。前端可用 `packages/shared` 同一純函數預覽，預覽不得寫回庫存。`GET /api/v1/time` 只供顯示。Socket.IO 只推已提交結果（MVP 不啟用）。Phaser 只讀已結算狀態，且**不進核心棧**。Redis **不是**主庫。

---

## 4. 冪等

同一實體、同一段已結算真實時間不得重複入帳。只計算 `lastSettledAt` 之後尚未入帳的區間。寫入成功後才推進：

- `lastSettledAt = nowReal`
- `last_settled_game = gameTime(nowReal)`（顯示，不裁切）

`jobs`、NestJS cron、讀取、開工、停止、收取、進頁補算必須走同一個入口。另寫一套扣庫公式即違反 ADR 0001。

```
settle(entity, nowReal, clock, rules, catalog) → SettlementResult
```

---

## 5. 離線上限

離線補算**必須有上限**，避免一次掃過無界歷史。

| 層 | 數字 |
| --- | --- |
| GDD v2.0 原稿（必須保留在 GDD） | `maxOfflineGameSec=86400`＝日長＝1 遊戲日＝24 真實分鐘；**不得入帳** |
| 產品入帳 cap | **8 現實小時**：`maxOfflineRealSec=28800`，衍生 `Config.maxOfflineGameSec=1728000`（20 遊戲日） |

寫入成功後游標仍推進到本次 `nowReal`。上限以外區間產能為 0，該區間關閉，不得再補產。禁止只把游標推進上限秒數留下餘額。ADR 0001 **不另定**第二套入帳上限。禁止把 GDD 的 86400 改寫成 1728000 冒充原稿，也禁止用 86400 裁切產能。原稿「28800 遊戲秒 = 遊戲內 8 小時」與 1:60 矛盾，廢棄。

---

## 相關文件

| 文件 | 職責 |
| --- | --- |
| [ADR 0001](adr/0001-tech-stack.md) | 技術棧、1:60、模組邊界、否決項 |
| [ADR 索引](adr/README.md) | 0001／0002／0003 編號約定 |
| [ADR 0003](adr/0003-production-rules.md) | 規則／驗證作為架構閘門 |
| [GDD v2.0 正式全文](gdd/production-system-v2.md) | 節 1–17（含 SQL／JSON） |
| [GDD 節次入口](gdd/production-system.md) | 舊錨點，不是第二套全文 |
| [architecture/overview.md](architecture/overview.md) | 模組展開、monorepo 建議 |
| [architecture/time-and-settlement.md](architecture/time-and-settlement.md) | 懶結算步驟 |
| [系統定義 v1.0](system-definition.md) | 產品範圍、離線 8 現實小時 |
