# 架構 0001：模組邊界

| 項 | 值 |
| --- | --- |
| 法源 | [ADR 0001](../adr/0001-tech-stack.md) |
| 索引 | [overview.md](overview.md)、[architecture.md](../architecture.md) |
| 時間常數 | [GDD 0002](../gdd/0002-time-and-settlement.md)；離線 8 現實小時見 [系統定義 §5](../system-definition.md) |
| 本階段 | 只寫文件，不建模組骨架 |

GDD `core/` 是純計算物件名。NestJS 模組是部署與 DI 邊界。**禁止再建模組叫 `core`。** 之後開工：純計算與共用型別放 `packages/shared`，由 `simulation` / `rules` 引用。

## NestJS 模組（部署邊界）

| 模組 | 職責 | HTTP | DB 寫入 | WS | 呼叫結算 | MVP |
| --- | --- | --- | --- | --- | --- | --- |
| `catalog` | 物品、類型、屬性 | 讀 | 否 | 否 | 否 | 要 |
| `rules` | 規則、公式、生成方式、驗證 | 只讀 GET + `POST /validate` | 不寫庫存 | 否 | 否 | 要 |
| `simulation` | 時鐘、Config、懶結算純函數 | **否** | **否** | **否** | 自己就是純計算 | 要 |
| `inventory` | **唯一入帳入口**；`GET /api/v1/time` | 是 | 是 | 否 | 呼叫 `simulation` | 要 |
| `realtime` | 推已提交結果（Socket.IO） | 否 | 否 | 是 | 否 | **關** |
| `jobs` | BullMQ tick 與離線補算 | 否 | 經同一入口 | 否 | 同一入口 | **關** |
| `PrismaModule` | Prisma 注入 | 否 | 供他模使用 | 否 | 否 | 要 |

`simulation` 不依賴 `inventory`、`jobs`、`realtime`、Prisma、Socket.IO。不讀 `Date.now()`。`nowReal` 由呼叫端注入。

MVP 可選 NestJS cron（`@nestjs/schedule`）：必須呼叫與 `inventory` **同一**結算入口，不得自備公式。引入 BullMQ 後改由 `jobs` 承擔，或 cron 仍只呼叫同一入口。

## GDD 純計算 ↔ NestJS（兩套名稱只對這一張表）

| GDD 純計算物件 | NestJS 模組 | 可碰 HTTP／DB／WS |
| --- | --- | --- |
| `GameClock`、`Config`、`Settlement` | `simulation` | 否 |
| `FormulaEngine`、`RuleEngine`、`MethodGenerator`、`LoopGenerator`、`Validator` | `rules` | 否（驗證器可被管理端呼叫，本身不開路由） |
| `systems.Inventory`、`systems.Production`、`systems.Building` | `inventory` | 可碰 HTTP 與 DB；計算仍呼叫 `simulation` / `rules` |
| 物品／類型／屬性靜態資料 | `catalog` | 讀為主 |
| 推送 | `realtime` | 只推已提交結果 |
| 離線補算與粗粒度 tick | `jobs` | 呼叫與 `inventory` 相同的結算入口 |

`Config` 跟隨 GDD 0002，不讀環境變數當第二套比例。GDD 原稿：`timeScale=60`、`maxOfflineGameSec=86400`（日長，不入帳）、`tickIntervalRealMs=5000`。入帳 cap：`maxOfflineRealSec=28800`（衍生 1,728,000 遊戲秒）。不得把 GDD 的 86400 從文件刪掉，也不得用 86400 裁切產能。

## 依賴方向（只准箭頭方向）

```
catalog  ←  rules  ←  simulation  ←  inventory
                                   ←  jobs
realtime  ←  只收 inventory 已提交的 DTO（不回呼結算）
```

| 準 | 不准 |
| --- | --- |
| `inventory` / `jobs` 呼叫 `simulation.Settlement` | `simulation` 依賴 `inventory`、Prisma、Socket.IO、Redis |
| `simulation` 讀 `rules` 已解析公式與 `catalog` 靜態定義 | `rules` 寫 `player_inventory` |
| `realtime` 推已入帳 DTO | `realtime` 算庫存或改 `lastSettledAt` |
| HTTP Controller 在 `inventory` / `catalog` / `rules` | `simulation` 開 Controller 或 Gateway |
| `GET /api/v1/time` 掛 `inventory`，內部呼叫 `GameClock` | 在 `simulation` 暴露 HTTP |

## 資料流

### 讀庫存／建築（懶結算）

1. HTTP 進入 `inventory`。
2. `inventory` 讀 PostgreSQL（Prisma）：實體的 `lastSettledAt`、`last_settled_game`、輸入／輸出／庫存。
3. 呼叫端注入 `nowReal`；`simulation.Settlement` 用真實差 cap 後 × 60 得到 `gameDeltaSec`。
4. 同輸入同結果。`inventory` 入帳；成功後同時寫 `lastSettledAt = nowReal` 與 `last_settled_game = gameTime(nowReal)`。
5. 回傳已結算狀態。MVP 不用 WS。目標：`realtime` 只推這次已提交的結果。

### 開工／停止／收取

先走上一節結算，再改隊列或扣發庫存。不得在未結算狀態上扣料。切換方式（目標首發）：先結算 → 扣成本 → 再套新方式。

### 驗證與生成

`rules.Validator` 通過後，`MethodGenerator` 才寫／啟用 `production_methods`。`catalog` 與規則列由資料載入，引擎不修改規則內容。

### 前端預覽

`packages/shared` 可跑同一 `Settlement`。預覽結果**不得**打寫入 API、不得當權威。

## 不跨層規則

| ID | 規則 |
| --- | --- |
| X-1 | 不得再建模組名叫 `core`。 |
| X-2 | `simulation` 不開 HTTP、不寫 DB、不碰 WS、不讀系統時鐘。 |
| X-3 | 所有入帳（玩家操作、進頁、cron、BullMQ）走 `inventory` 同一入口。 |
| X-4 | `jobs` 不得自備扣庫公式。 |
| X-5 | `realtime` 不計算、不入帳。 |
| X-6 | 客戶端與 Phaser 不得寫回權威庫存。 |
| X-7 | Redis 不是主庫；權威在 PostgreSQL。 |
| X-8 | 結算產能用真實 `lastSettledAt` 差 × 60；禁止只用 `last_settled_game` 相減入帳。 |
| X-9 | `packages/shared` 不得依賴 Prisma、Socket.IO、Redis 客戶端。 |

## 伺服器權威、冪等、離線上限

- 伺服器是唯一權威。前端預覽不得寫回庫存。
- 同一實體、同一段已結算真實時間不得重複入帳。
- 離線補算必須有上限。GDD 原稿 `maxOfflineGameSec=86400` 必須保留在 GDD（日長，不入帳）。產品入帳 cap **必須**是 8 現實小時（`maxOfflineRealSec=28800`）。沒有上限的離線補算違反 ADR 0001。
- 產能真實差先 cap 再 × 60。寫入成功後游標進到 `nowReal`，上限外產能 0。
- 目標 vs MVP：Redis／BullMQ／Socket.IO 目標保留、MVP 可關。
