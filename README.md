# 崗起 / Ascent

| 項 | 值 |
| --- | --- |
| 版本 | 工程 MVP 0.1.0（2026-10-06） |
| 狀態 | **農業切片可玩骨架已開工**：NestJS + Prisma + React；無登入、無 Redis、無 WebSocket |

《**崗起**》（Ascent）是無限發展的模擬經營。中文義譯「崛起」指**同一產品**，禁止拆成兩款遊戲。產品核心是**生產鏈深度**；引擎核心是**規則驅動生產**。無勝利條件。玩家做：**建造 + 管理 + 競爭 + 探索**。引擎只認識規則與類型，永不修改規則；生產方式由規則生成。時間採**懶結算**，`timeScale=60`（**1 真實秒 = 60 遊戲秒 = 1 遊戲分鐘**；真實 1 分鐘 = 遊戲 1 小時；真實 1 小時 = 遊戲 60 小時；真實 1 日 = 遊戲 60 日）。

工程 MVP 程式在 `apps/` 與 `packages/shared`。設計契約仍以 [docs/README.md](docs/README.md) 為準。

---

## 核心精神

| 原則 | 含義 |
| --- | --- |
| 規則驅動生產 | 引擎只認識規則與類型，**永不修改**；`production_methods` 由規則生成 |
| 資料驅動 | 物品、規則、方式、層級、解鎖都是資料；帶 `released_in_version`、`is_active` |
| 不跳級／DAG | 層級與繼承禁止循環、禁止一次跳多級；繼承深度上限 10 |
| 懶結算 | 讀取／操作、BullMQ 粗粒度 tick、上線／離線補算都走 `settle`；保存 `lastSettledAt` |
| `timeScale=60` | 遊戲時間差 = 真實差 × 60；時間算出來、不存「現在」 |
| 伺服器權威 | 純函數可重播、冪等；離線上限 8 現實小時；客戶端只顯示 |

細則：[GDD v2.0](docs/gdd/production-system-v2.md)、[時間與結算](docs/architecture/time-and-settlement.md)。

---

## 定位

| 欄位 | 決策 | 狀態 |
| --- | --- | --- |
| 名稱 | 崗起 / Ascent（義譯：崛起，同一產品） | **確定** |
| 類型 | 無限發展的模擬經營 | **確定** |
| 核心 | 生產鏈深度 | **確定** |
| 勝利條件 | 無 | **確定** |
| 平台 | 網頁 + 手機 | **確定** |
| 商業 | 免費 + 內購 | **確定** |
| 團隊 | 1 人 | **確定** |
| 在線 | ≤ 1000 人 | **確定** |
| 工程 MVP | 農業切片 + 離線結算 + 存檔；無登入、無市場、無排行榜 | **確定** |
| 離線上限 | 8 現實小時（`maxOfflineRealSec=28800` → 1,728,000 遊戲秒 = 20 遊戲日） | **確定** |

產品法源：[docs/system-definition.md](docs/system-definition.md)。[舊檔名](docs/system-definition-v1.md) 只轉址，非法源。

---

## 已定案技術棧

目標架構**已定案**（見 [ADR 0001](docs/adr/0001-tech-stack.md)）。MVP／單人期用同一套 NestJS 單體，**先不啟用** Redis、BullMQ、Socket.IO。

| 項 | 目標（確定） | MVP／單人期（分期） |
| --- | --- | --- |
| 語言 | TypeScript 全棧 | 同左 |
| 前端 | React + TypeScript + Vite | HTTP 拉狀態 |
| 地圖 | Phaser 3 **不**進入核心棧 | 同左 |
| 後端 | Node.js + NestJS 模組化單體 | 同左；不開微服務 |
| 主庫 | PostgreSQL + JSONB + GIN | 單一實例 |
| 資料存取 | Prisma | 同左 |
| 快取／佇列 | Redis + BullMQ（Redis 不是主庫） | **不用 Redis**；可選 NestJS 定時器 |
| 即時 | NestJS Gateway + Socket.IO | **不用 WebSocket** |
| 時間 | 1:60；懶結算；入帳 8 現實小時 | 同左 |
| 認證 | 其後簡單 JWT、無第三方 | **無登入** |
| 部署 | 本機 Docker Compose；雲端不鎖定 | 初期可單一服務（Railway／Render 僅建議） |

否決：Fastify 當核心、Phaser 進核心、Redis 當主庫、每 tick 全量模擬、`1 真實秒 = 61 遊戲秒`。

時間寫死：**1 真實秒 = 60 遊戲秒 = 1 遊戲分鐘**；遊戲 1 天 = 24 真實分鐘。

```
gameTime = startGameTime + (now - startRealTime) / 1000 × timeScale
```

存 `startRealTime`／`startGameTime`／`finishAt`／`lastUpdate`，**不存**當前遊戲時間。`GET /api/v1/time` 僅顯示。GDD 原稿：`timeScale=60`、`maxOfflineGameSec=86400`（日長，不入帳）、`tickIntervalRealMs=5000`。

---

## 開發原則

- 現成 > 自寫、單體 > 微服務、一庫 > 拆分、手動 > 自動化、簡單 > 複雜。
- 優先級：**生產鏈深度 > 數值平衡 > 視覺 > 玩家互動 > 擴展性 > 上線速度**。
- 開發順序：生產鏈核心 → 數值平衡 → 離線結算 → 存檔 → 視覺 → 玩家互動。
- 引擎只認識規則與類型，永不修改；資料驅動；不跳級；DAG 不循環。
- 1 真實秒 = 60 遊戲秒；懶結算；伺服器權威；無加速。
- 離線上限以系統定義為準（8 現實小時）。GDD 原稿 `maxOfflineGameSec=86400` 只當日長，不得入帳。

---

## 文件索引

完整閱讀順序與衝突表：[docs/README.md](docs/README.md)。

| 路徑 | 內容 | 狀態 |
| --- | --- | --- |
| [docs/README.md](docs/README.md) | 文件索引、閱讀順序、衝突時聽誰的 | 索引 |
| [docs/system-definition.md](docs/system-definition.md) | 系統定義 v1.0（產品法源） | **確定** |
| [docs/system-definition-v1.md](docs/system-definition-v1.md) | 舊檔名轉址 | 轉址 |
| [docs/adr/README.md](docs/adr/README.md) | ADR 編號約定（0001 技術棧／0002 產品／0003 規則閘門） | 索引 |
| [docs/adr/0001-tech-stack.md](docs/adr/0001-tech-stack.md) | 技術棧定案與分期落地 | **確定**／**分期** |
| [docs/adr/0002-product-constraints.md](docs/adr/0002-product-constraints.md) | 單人、1000 人、免費+內購 | **確定** |
| [docs/adr/0003-production-rules.md](docs/adr/0003-production-rules.md) | 規則／驗證作為架構約束（編號 0002 已用於產品約束，不另建 `0002-production-rules.md`） | **確定** |
| [docs/gdd/production-system-v2.md](docs/gdd/production-system-v2.md) | 《崗起》遊戲設計文件 v2.0 正式全文（節 1–17） | **確定** |
| [docs/gdd/production-system.md](docs/gdd/production-system.md) | GDD 節次入口與核心規則速覽 | 入口 |
| [docs/gdd/launch-scope.md](docs/gdd/launch-scope.md) | 目標首發範圍、統計、改版節奏 | **確定** |
| [docs/production-system.md](docs/production-system.md) | 規則濃縮契約（不是第二套 GDD） | **確定** |
| [docs/architecture.md](docs/architecture.md) | 模組邊界、懶結算、權威、冪等、離線上限 | **確定** |
| [docs/architecture/overview.md](docs/architecture/overview.md) | 技術架構、NestJS 模組、monorepo 建議 | **確定** |
| [docs/architecture/time-and-settlement.md](docs/architecture/time-and-settlement.md) | 1:60、懶結算、冪等、離線上限 | **確定** |
| [docs/api/v1.md](docs/api/v1.md) | API v1 端點表 | **確定** |
| [docs/game-design.md](docs/game-design.md) | 設計入口（不是第二套 GDD） | 入口 |
| [docs/mvp.md](docs/mvp.md) | 工程 MVP 範圍與驗收 | **確定** |
| [docs/gdd/mvp-agriculture-catalog.md](docs/gdd/mvp-agriculture-catalog.md) | 農業切片 ID、規則槽位、驗證對照 | **確定** |
| [docs/roadmap.md](docs/roadmap.md) | 開發順序與分期 | **分期** |

GDD 分冊：[0001](docs/gdd/0001-overview.md) · [0002](docs/gdd/0002-time-and-settlement.md) · [0003](docs/gdd/0003-tiers-and-types.md) · [0004](docs/gdd/0004-rules-and-methods.md) · [0005](docs/gdd/0005-schema-and-api.md) · [0006](docs/gdd/0006-engine.md) · [0007](docs/gdd/0007-scope-expansion.md)。

架構：[overview](docs/architecture/overview.md) · [時間與結算](docs/architecture/time-and-settlement.md) · [模組邊界](docs/architecture/0001-module-boundaries.md) · [API v1](docs/api/v1.md)。

---

## 目錄

```
apps/web          React + TypeScript + Vite
apps/api          Node.js + NestJS（catalog / rules / simulation / inventory / PrismaModule）
packages/shared   共用型別與結算純函數
```

## 本機啟動

```
pnpm install
pnpm setup:db
pnpm dev
```

或分開啟動 API／前端：`pnpm dev:api`、`pnpm dev:web`。

`setup:db` 會從根目錄 `.env.example` 複製出 `apps/api/.env`（若尚不存在）、產生 Prisma Client、`db push` 並種子。Prisma 讀取的是 **`apps/api/.env`**，不是根目錄 `.env`。CLI 設定（schema 路徑、`DATABASE_URL`、migration 目錄、seed 指令）在 **`apps/api/prisma.config.ts`**。執行期與 seed 透過 **driver adapter**（SQLite：`@prisma/adapter-better-sqlite3`；PostgreSQL：`@prisma/adapter-pg`）建立 `PrismaClient`；Client 產生於 `apps/api/generated/prisma/`（已 gitignore）。

前端：http://localhost:5173 。API：http://localhost:3000/api/v1/state 。

目標主庫仍是 PostgreSQL（ADR 0001）。`prisma/migrations/` 內 SQL 對應 **PostgreSQL**（`JSONB` 等）。工程 MVP 預設在 `apps/api/prisma/schema.prisma` 使用 **SQLite**（`DATABASE_URL="file:./dev.db"`，檔案落在 **`apps/api/prisma/dev.db`**），本機無 Docker 即可 `pnpm setup:db` 可玩。

若要改用 Compose 裡的 Postgres：先 `pnpm db:up`，把 `schema.prisma` 的 `provider` 改為 `postgresql`，`apps/api/.env` 的 `DATABASE_URL` 改為 `postgresql://ascent:ascent@localhost:5432/ascent`，再執行 `pnpm --filter @ascent/api exec -- prisma migrate deploy` 與 `pnpm db:seed`（不要用 `db push` 覆蓋正式 migration）。

`packages/shared` 不得依賴 Prisma、Socket.IO 或 Redis 客戶端。權威寫入只留在 `apps/api`。否決：Fastify 當核心、Phaser 進核心、Redis 當主庫、每 tick 全量模擬。

---

工程 MVP 已能：農業目錄、規則生成方式、懶結算、離線 8 現實小時 cap、自動存檔、數據畫面。市場／登入／排行榜／AI 訂單仍不在本切片。
