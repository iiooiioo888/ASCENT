# GDD 0005：Schema、API、驗證清單（節 10、12、15）

正式全文：[production-system-v2.md](production-system-v2.md) §10、§12、§15。濃縮契約：[../production-system.md](../production-system.md)。本分冊為欄位級正文（SQL／API）。開工寫 Prisma 時以 [ADR 0001](../adr/0001-tech-stack.md) 為準：以 Prisma 對應 PostgreSQL，結算用 `lastSettledAt` + 懶結算。欄位語意不得與本檔、濃縮契約或 ADR 相反。可變 `properties` 用 JSONB + GIN。

日長必須可表達：`game_config.game_day_game_sec=86400`（承接 GDD 原稿 `maxOfflineGameSec`），**不得當入帳 cap**。Prisma 預設可寫死 86400，且可與 `server_state` 合成單列，但語意欄**不得消失**。禁止「硬編碼所以不建欄」而與全文 SQL 打架。獨立 API 表：[../api/v1.md](../api/v1.md)。

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

## 10. Schema

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

## 12. API

前綴 `/api/v1`。伺服器權威。GET 可結算實體時先懶結算。

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

寫入前必須先懶結算。開工：先結算再扣輸入。停止：先結算，不回滾已入帳產出。收取：先結算再發已入帳產出。

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

## 相關文件

| 文件 | 職責 |
| --- | --- |
| [GDD v2.0 §10／§12／§15](production-system-v2.md#10-schema) | Schema／API／驗證全文 |
| [API v1](../api/v1.md) | 獨立端點表 |
| [ADR 0001](../adr/0001-tech-stack.md) | Prisma → PostgreSQL；`lastSettledAt` + 懶結算 |
| [ADR 0003](../adr/0003-production-rules.md) | 驗證閘門 |
| [0002](0002-time-and-settlement.md) | 雙時鐘與入帳 cap |
