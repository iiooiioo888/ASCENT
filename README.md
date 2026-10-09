# 帝國掘起

| 項 | 值 |
| --- | --- |
| 版本 | 工程 MVP 0.1.0（2026-10-07） |
| 狀態 | **農業切片可玩**：生產鏈、資源循環、莊外商行 NPC 買賣；NestJS + Prisma + React；JWT access＋refresh；無 Redis、無 WebSocket |

## 現況（給 GitHub 訪客）

本倉庫已可本機跑通：**種 → 磨 → 麵 → 烤** 主線、**水井汲水**與**田留種**解卡、**莊外商行**（`bdef_trading_post`）以 NPC 固定價買賣補給；開局銅錠 `STARTING_COPPER = 50_000`。佔槽上限 **12**，倉不佔槽，田上限 **2**。礦業等選項卡要達到里程碑才解鎖。核心仍為**懶結算**、`timeScale=60`、離線上限 8 現實小時、伺服器權威。無勝利條件、無玩家對玩家市場。

《**帝國掘起**》是本遊戲的正式名稱。無限發展模擬經營，產品核心是**生產鏈深度**；引擎核心是**規則驅動生產**（方式由規則生成，引擎不改規則）。設計契約見 [docs/README.md](docs/README.md)。

---

## 1. 項目簡介與玩法閉環

### 你在做什麼

在農業切片裡，用數座建築與庫存，把原料一路加工成麵包，並用副產與商行維持資源與銅錠循環。沒有通關目標，只有鏈條變深、產線變順。

### 主線生產鏈（種 → 磨 → 麵 → 烤）

| 步驟 | 建築 | 方式（示例 id） | 輸入 → 輸出 |
| --- | --- | --- | --- |
| 種 | 田 `bdef_field` | `method_grow_wheat_default` | 種子 + 水 → 小麥 + 秸稈 |
| 磨 | 磨坊 `bdef_mill` | `method_mill_flour_default` | 小麥 → 麵粉 |
| 麵 | 爐 `bdef_oven` | `method_make_dough_default` | 麵粉 + 水 → 麵團 |
| 烤 | 爐 `bdef_oven` | `method_bake_bread_default` | 麵團 → 麵包 |

磨坊亦可 `method_mix_feed_default`（秸稈 + 小麥 → 飼料）。飼料可再送化工廠製肥料。完整農業物品 id 見 [docs/gdd/mvp-agriculture-catalog.md](docs/gdd/mvp-agriculture-catalog.md)。產業擴充見 [docs/gdd/industry-expansion-catalog.md](docs/gdd/industry-expansion-catalog.md)。

### 產業擴充（主介面每個產業一張選項卡；放置後才開工，開局不預放）

一次只打開一個產業。農業選項卡含田、磨坊、爐、水井、倉與商行。

| 選項卡 | 建築 | 主線 |
| --- | --- | --- |
| 礦業 | 礦坑、採石場、冶煉爐 | 鐵礦／煤 → 鐵錠 → 焦炭 → 鋼 |
| 林木 | 林地 | 原木；木板在工坊鋸成 |
| 化工 | 窯、化工廠 | 石灰＋鹽 → 鹼；飼料＋鹼 → 肥料 |
| 工業 | 工坊、機械廠 | 釘／工具／齒輪／木板 → 機械 |
| 能源 | 鍋爐 | 焦炭 → 蒸汽；蒸汽機在機械廠組裝 |

秸稈或原木可燒木炭，木炭可代替煤煉鐵。商行可賣出鋼、機械、蒸汽機等，也可買入煤與鐵礦。既有資料庫需重新種子後才看得到新目錄。

### 資源循環（水井 + 留種）

開局預放田、磨坊、爐、**水井**（`seedPlacedBuildingDefIds`；**已拍板 D2**）。

| 機制 | 建築 | 方式 | 說明 |
| --- | --- | --- | --- |
| 汲水 | 水井 `bdef_well` | `method_draw_water_default` | 無輸入產水；600 遊戲秒產出水 ×5（已簽核） |
| 留種 | 田 | `method_save_seed_default` | 小麥 → 種子，避免種子斷鏈 |

### 莊外商行（NPC 固定價）

- 獨立建築 **`bdef_trading_post`**（莊外商行），開局預放 1 座；**不能**對商行 `start` 生產，買賣只走 HTTP 市集 API。
- 結算貨幣為庫存 **`item_copper_ingot`**；開局 **`STARTING_COPPER = 50_000`**。
- 賣出農產換銅錠、買入種子／水等補給；價目為伺服器固定表（非玩家掛單市場）。

### 操作迴路（玩家）

1. 進頁 `GET /api/v1/state` → 懶結算後看庫存與建築。
2. 對建築 **開工** → 等待遊戲時間 → **收取** 產出。
3. 資源不足時：水井汲水、田留種，或到商行買入。
4. **停止**生產：已扣輸入**不退還**（**已拍板 D6**）；已入帳產出保留，需收取或停止前結算。

時間：**1 真實秒 = 60 遊戲秒**；離線再開最多補 **8 現實小時**。

---

## 2. 安裝與啟動

需 [Node.js](https://nodejs.org/)（建議 LTS）與 [pnpm](https://pnpm.io/)（根目錄 `packageManager`：`pnpm@9.15.0`）。

**一次裝好依賴並初始化資料庫：**

```bash
pnpm setup
```

等同 `pnpm install` 後執行 `pnpm setup:db`（複製 `apps/api/.env`、建 shared、Prisma generate、`db push`、種子）。

**日常開發：**

```bash
pnpm dev
```

或分開：`pnpm dev:api`、`pnpm dev:web`。

| 服務 | URL |
| --- | --- |
| 前端 | http://localhost:5173 |
| API（範例） | http://localhost:3000/api/v1/state |

工程 MVP 預設 **SQLite**（`apps/api/prisma/dev.db`），無 Docker 即可玩。若要 PostgreSQL：見下方「目錄與部署備註」。

---

## 3. 架構與技術棧

Monorepo 佈局：

```
apps/web          React + TypeScript + Vite（HTTP 拉權威狀態）
apps/api          NestJS 模組化單體 + Prisma
packages/shared   共用型別、農業目錄、結算純函數（不依賴 Prisma／Redis）
```

| 項 | MVP 實際 |
| --- | --- |
| 後端 | NestJS：`catalog` / `rules` / `simulation` / `inventory`（+ 市集模組隨 MK-BE-1 合入） |
| 資料 | Prisma；權威狀態在 DB |
| 前端 | React + Vite |
| 時間 | `timeScale=60`；**懶結算**（GET 狀態、寫入前結算、可選定時器粗 tick） |
| 認證 | JWT access（15 分）＋旋轉 refresh（無第三方）。見 [docs/api/v1.md](docs/api/v1.md) 認證節 |
| 快取／即時 | **不用** Redis、BullMQ、WebSocket |

懶結算要點：保存 `lastSettledAt` 等游標；遊戲時間由 `startRealTime`／`startGameTime` 推算，不存「現在」。細則：[時間與結算](docs/architecture/time-and-settlement.md)。

目標棧與分期見 [ADR 0001](docs/adr/0001-tech-stack.md)。

### API 與遊戲迴路（摘要）

權威契約以 [docs/api/v1.md](docs/api/v1.md) 為準；下列與現行／合入中的 MK-BE-1 一致。

| 類別 | 方法 | 路徑 | 用途 |
| --- | --- | --- | --- |
| 時間 | GET | `/api/v1/time` | 顯示用遊戲時鐘（不結算） |
| 狀態 | GET | `/api/v1/state` | 庫存 + 建築 + 進行中（先結算） |
| 建築 | GET/POST | `/api/v1/buildings`、`/api/v1/buildings/:id/*` | 列表、放置、`start`／`stop`／`collect` |
| 目錄 | GET | `/api/v1/items`、`/production-methods` 等 | 只讀目錄 |
| 市集 | GET | `/api/v1/market` | 金幣、價目、持有量 |
| 市集 | POST | `/api/v1/market/sell`、`/api/v1/market/buy` | NPC 固定價賣／買 |

寫入（開工、停止、收取、買賣）前必先懶結算。`GET /time` 不推進結算游標。

---

## 4. 截圖

以下為 stack tip 實機擷圖（素材來源見 [docs/readme-screenshots/MANIFEST.md](docs/readme-screenshots/MANIFEST.md)）。

### 主介面

HUD、背包，以及每個產業一張選項卡（農業、礦業、林木、化工、工業、能源）下的產業鏈與建築卡：

![主介面](docs/readme-screenshots/01-main-ui-hud-buildings.png)

### 水井

水井建築卡與汲水方式：

![水井](docs/readme-screenshots/02-well-building-card.png)

### 莊外商行與金幣

HUD 金幣 10、商行「交易」展開買賣面板：

![莊外商行與 HUD 金幣](docs/readme-screenshots/04-trading-post-market-panel-hud-gold.png)

### 更多（耗盡引導）

資源耗盡時 CTA（水井／留種／前往商行）：

![耗盡 CTA](docs/readme-screenshots/03-depletion-ctas-well-seed-market.png)

![前往商行高亮](docs/readme-screenshots/05-depletion-go-market-scroll-highlight.png)

---

## 5. 已拍板決策、待定與路線圖

### 已拍板（工程 MVP 農業）

| 決策 | 內容 |
| --- | --- |
| D2 預放水井 | 種子世界預放田、磨坊、爐、水井（及商行建築實體） |
| D6 停止不退料 | `POST .../stop` 不退還已扣輸入 |
| 莊外商行 | `bdef_trading_post` 獨立建築；交易走 `/api/v1/market`，非生產 `start` |
| 開局銅錠 | `STARTING_COPPER = 50_000`（`item_copper_ingot`；`STARTING_GOLD` 只是別名） |
| 遊戲名稱 | 《帝國掘起》 |
| 核心不變 | 懶結算、`timeScale=60`、離線 8h cap、無 PvP 市場／排行榜。登入是 JWT＋refresh，不改時間比例 |

### 待定（產品）

| 議題 | 說明 |
| --- | --- |
| 對外 logo | 視覺標誌尚未定稿 |
| 目錄補洞 | 牧場／食品廠尚未寫進產業擴充目錄；見 [next.md](docs/next.md) 序 3 |

### 路線圖（簡述）

任務順序見 [docs/next.md](docs/next.md)：文件對齊與數值可玩化已完成 → 目錄補洞 → 顯示名單一來源 → 目標首發補到 50–100 物品 → 視覺。登入（F1）已完成。其後才是 F2→F6：玩家對玩家市場、排行榜、完整 AI 訂單、Redis、WebSocket。

完整分期：[docs/roadmap.md](docs/roadmap.md)、驗收：[docs/mvp.md](docs/mvp.md)。

---

## 核心精神

| 原則 | 含義 |
| --- | --- |
| 規則驅動生產 | 引擎只認識規則與類型，**永不修改**；`production_methods` 由規則生成 |
| 資料驅動 | 物品、規則、方式帶 `released_in_version`、`is_active` |
| 不跳級／DAG | 禁止循環與跳級；繼承深度上限 10 |
| 懶結算 | 讀取與寫入走同一 `settle`；保存 `lastSettledAt` |
| 伺服器權威 | 純函數可重播；客戶端只顯示 |
| 規劃北星 | 核心玩法＝空間效率×時間規劃＝利潤；見 [docs/gdd/core-loop-planning.md](docs/gdd/core-loop-planning.md) |

---

## 已定案技術棧（摘要）

| 項 | MVP／單人期 |
| --- | --- |
| 語言 | TypeScript 全棧 |
| 前端 | React + Vite |
| 後端 | NestJS 模組化單體 |
| 主庫 | PostgreSQL（目標）；本機預設 SQLite |
| ORM | Prisma |
| 時間 | 1:60；懶結算；離線 8 現實小時 |

否決：Fastify 當核心、Phaser 進核心、Redis 當主庫、每 tick 全量模擬、`timeScale≠60`。

---

## 文件索引

| 路徑 | 內容 |
| --- | --- |
| [docs/README.md](docs/README.md) | 閱讀順序與衝突表 |
| [docs/system-definition.md](docs/system-definition.md) | 產品法源 |
| [docs/mvp.md](docs/mvp.md) | 工程 MVP 範圍 |
| [docs/api/v1.md](docs/api/v1.md) | HTTP API v1 |
| [docs/gdd/mvp-agriculture-catalog.md](docs/gdd/mvp-agriculture-catalog.md) | 農業切片 ID |
| [docs/gdd/industry-expansion-catalog.md](docs/gdd/industry-expansion-catalog.md) | 礦、化、工、能源、林木擴充 |
| [docs/next.md](docs/next.md) | 現況與下一步 |
| [docs/architecture/overview.md](docs/architecture/overview.md) | 模組與 monorepo |

---

## 目錄與部署備註

`packages/shared` 不得依賴 Prisma 或 Redis。權威寫入只在 `apps/api`。

`setup:db` 會從根目錄 `.env.example` 複製 `apps/api/.env`（若不存在）。Prisma 讀 **`apps/api/.env`**。

若要 PostgreSQL：`pnpm db:up`，將 `schema.prisma` 改 `postgresql`，`DATABASE_URL` 指向 Compose，再 `prisma migrate deploy` 與 `pnpm db:seed`（勿用 `db push` 覆蓋正式 migration）。

### API 整合測試（Vitest）

`apps/api/test/test-db.ts` 會依 `DATABASE_URL` 選擇後端：

| 模式 | 條件 | 行為 |
| --- | --- | --- |
| **SQLite（預設）** | 未設或 `file:`／`sqlite:` | 每個整合 suite 建臨時 `.db`，`prisma db push` |
| **PostgreSQL** | `postgresql://` 或 `postgres://` | 沿用該 URL，`prisma migrate deploy`；`beforeEach` 重跑 `seed.ts` |

**SQLite（同 `build-test` CI）：**

```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes pnpm setup:db
pnpm typecheck
pnpm --filter @ascent/api test
```

整合測試會對臨時庫執行 `db push --accept-data-loss`；在 Cursor／部分環境需設 `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes`。`settlement-db-lock`、`inventory-multi-instance` 在 SQLite 上會 **skip**（需 Postgres advisory lock）。

**PostgreSQL（同 `postgres-migrate-test` CI）：**

```bash
export DATABASE_URL="postgresql://ascent:ascent@localhost:5432/ascent"
pnpm install --frozen-lockfile
node scripts/ci-postgres-setup.mjs
pnpm --filter @ascent/shared build
pnpm --filter @ascent/api prisma:generate
pnpm --filter @ascent/api exec -- prisma migrate deploy
pnpm db:seed
pnpm --filter @ascent/api test
```

本機可先 `pnpm db:up` 啟動 Compose Postgres，再執行上列指令（`ci-postgres-setup.mjs` 會把 `schema.prisma` provider 改為 `postgresql` 並寫入 `apps/api/.env`）。

**VPS 正式部署（Postgres + API + nginx）**：見 [docs/deploy-docker.md](docs/deploy-docker.md)（`docker compose -f docker-compose.prod.yml up --build`）。
