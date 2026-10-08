# AI 訂單

| 項 | 值 |
| --- | --- |
| 狀態 | 後續設計（2026-10-06）。**只定義，不實作** |
| 範圍 | **不在 MVP**。核心循環之後的資源出口。`is_active` 可關，預設關 |
| 產品 | [系統定義 v1.0](../system-definition.md) §6、§8 |
| 工程切片 | [mvp.md](../mvp.md) 非目標。MVP 仍是農業、5–10 物品、離線結算、存檔；無登入、無玩家對玩家市場、無排行榜 |
| 時間 | [ADR 0001](../adr/0001-tech-stack.md)、[GDD 0002](0002-time-and-settlement.md)。`duration_game_sec` 單位是**遊戲秒** |
| 結算 | 懶結算、伺服器權威、冪等、公式可重播、同輸入同結果。懶結算只做生成與過期；接受與拒絕是玩家操作，同樣冪等 |
| 儲存 | PostgreSQL。不依賴 Redis、BullMQ、WebSocket |
| 模組 | 不改 ADR 0001 的 NestJS 模組邊界。未來可加 `orders`；現階段不實作、不掛載 |

本檔是這套機制的唯一設計正文。不要在別處再寫一份訂單規則。

---

## 1. 定位與原則

訂單是資源出口：把已入帳的庫存換成獎勵，讓生產循環有去處。它接在核心生產循環之後，不取代生產，也不進工程 MVP。

玩家不判斷真偽。訂單就是訂單。設計文件可以稱「AI 訂單」；玩家可見的標題、內文、API 回應不得出現「假」、真偽標記或「AI 生成」。

| ID | 決定 |
| --- | --- |
| R-AI1 | 訂單是資源出口。玩家不判斷真偽。訂單就是訂單。「假」不出現在玩家可見資訊。 |
| R-AI2 | 生成可重播、冪等。種子由 `(playerId, spawn_bucket, ruleId)` 派生。結算路徑禁止 `Math.random()`。同一時間片、同一規則重複結算不得再生成一張。 |
| R-AI3 | 接受即結算，且必須冪等。資源足夠才能接受；接受當下扣資源並發獎，`pending` → `completed`。不得重複扣資源或重複發獎。v1 沒有運送延遲。`accepted` 只留給以後物流，本版不寫入。 |
| R-AI4 | `rejected` 與 `expired` 為終態。`completed` 也是終態。終態不再扣庫存、不再發獎。 |
| R-AI5 | 懶結算只能生成與過期。沒有玩家接受時，結算不得把訂單改成 `completed`。 |
| R-AI6 | 本機制不在 MVP。`is_active = false` 時整組規則不生成。頻率表的「每遊戲小時機率」× 60 = 「現實每小時期望次數」。 |

與 ADR 0001 對齊：生成與過期判斷是純函數，同輸入同結果；寫入成功後同一鍵不得再入帳。接受走同一權威庫存入口，重送不得第二次扣款或發獎。

---

## 2. 與既有契約對齊（修正）

下列幾點若與早期草稿不同，以本節為準。理由寫在各段，不把已廢棄的公式再抄進規則。

### 2.1 時間比例

ADR 0001 寫死：

- **1 現實秒 = 60 遊戲秒 = 1 遊戲分鐘。**
- 1 現實分鐘 = 1 遊戲小時。
- 1 現實小時 = 60 遊戲小時。
- 1 遊戲日 = 86400 遊戲秒 = 24 現實分鐘。

`duration_game_sec` 是遊戲秒。換算：現實秒 = 遊戲秒 ÷ 60。草稿若把這個欄位當成現實秒，或把 86400 遊戲秒讀成 86400 現實秒，與 1:60 矛盾，本檔不採用。每個範例在第 6 節標出現實秒與現實分鐘。

### 2.2 頻率換算（保留）

頻率表第一欄是**每遊戲小時機率**。1 現實小時 = 60 遊戲小時，所以：

**現實每小時期望次數 = 每遊戲小時機率 × 60。**

例：0.05 × 60 = 3。3 是現實每小時的期望張數；0.05 仍是每遊戲小時的機率，不把表改成直接填 3 取代機率。

### 2.3 離線上限（不在本機制重定）

訂單不另定離線上限，也不改「上限是 8 現實小時」這個決定。入帳窗口聽 [系統定義 §5](../system-definition.md) 與 ADR 0001：

8 現實小時 = 8 × 3600 現實秒 = **28,800 現實秒** = 28,800 × 60 = **1,728,000 遊戲秒** = 480 遊戲小時 = 20 遊戲日。

既有文件已寫明早期「28800 遊戲秒 = 遊戲內 8 小時」與 1:60 矛盾並已廢棄。本檔不把該式寫回。訂單補算使用本次懶結算已經裁切過的遊戲時間窗，不另掃無界過去，也不每遊戲秒跑迴圈。

### 2.4 結算必須可重播

草稿若在結算路徑使用 `Math.random()`，同一輸入會得到不同訂單，違反「同輸入同結果」與冪等。正式規則改成確定性擲骰：種子只來自玩家 id、規則 id、遊戲小時桶。雜湊算法與位元組切法鎖定在第 7 節，不得改成「實作自選」，否則兩邊結算結果會分叉。消耗比例不另開隨機源，用同一段明文再加 `item_id` 派生，見第 7 節。

同一桶重複結算不得再插入一張。達上限而跳過的桶沒有訂單列，所以「已掃過」不能只靠訂單表判斷；掃描游標見第 5 節，升序推進見第 8.1 節。接受同樣冪等：已完成的重送不得再扣、再發。

### 2.5 單人初期的執行方式

初期不把 Redis、BullMQ、Socket.IO 當本機制的前提。目標棧仍聽 ADR 0001（那些元件不從定案表刪除），但訂單狀態以 PostgreSQL 為準。生成與過期在讀取或操作時，依上次已處理的桶補算到本次時間窗。ADR 的 NestJS 模組清單（`catalog`、`rules`、`simulation`、`inventory`、`realtime`、`jobs`）不在本檔改寫。未來可加 `orders` 模組，扣庫必須呼叫與 `inventory` 相同的入口；**現階段不實作、不掛載。**

---

## 3. 來源、獎勵、消耗檔位

來源（`source`）：

| 值 | 含義 |
| --- | --- |
| `npc_merchant` | NPC 商人 |
| `guild` | 公會 |
| `city` | 城市 |
| `event` | 事件 |
| `season` | 賽季（資料種類先留；賽季營運見第 11 節，未做） |

獎勵種類（`reward_kind`）：

| 值 | 含義 |
| --- | --- |
| `resource` | 資源 |
| `gold` | 金幣 |
| `reputation` | 聲望 |
| `special` | 特殊 |
| `xp` | 經驗 |

消耗帶是**生成時**對玩家當時該物品持有量的取樣指引。訂單上的 `required_items` 是**絕對件數**。帶的百分比不會原樣變成倉庫扣除量，也不會顯示成「繳交 10%」。

| 帶 | `band` | 相對當時持有量 |
| --- | --- | --- |
| 少量 | `small` | 10–30% |
| 中量 | `medium` | 30–60% |
| 大量 | `large` | 60–90% |
| 全部 | `all` | 100% |

「當時」指定為**生成該張訂單的時刻**。`ratio` 用第 7 節的確定性擲骰，落在 `[ratio_min, ratio_max)`（上端取不到）。`all` 帶兩端都是 1，比例就是 1，與擲骰無關。然後：

`quantity = floor(當時持有量 × ratio)`

這個 `quantity` 寫進該張訂單的 `required_items`，之後接受就扣這份絕對數量，不再乘百分比。同一 `(playerId, spawn_bucket, ruleId)` 重複結算時讀既有列，不重算一張新單，因此持有量事後變動也不改已寫入的件數。持有量為 0，或 `floor` 之後件數為 0，都不為該物品生成訂單行；否則少量持有配上低比例會寫出 0 件，接受時不扣資源卻發獎。沒有任何行則本桶不插入。

第 6 節城市穀物裡的 **100 小麥是 100 件**，不是 100%，也不是 small 帶的端點。示意演算：當時持有 1000、擲骰得到 `ratio = 0.10`，則 `floor(1000 × 0.10) = 100`。

---

## 4. 狀態

v1 實際寫入的狀態只有：

`pending` → `completed` / `rejected` / `expired`

| 狀態 | 誰寫入 | 之後 |
| --- | --- | --- |
| `pending` | 結算生成 | 可接受、可拒絕、可過期 |
| `completed` | 玩家接受（同一交易內扣庫並發獎） | 終態 |
| `rejected` | 玩家拒絕 | 終態；不扣庫存、不發獎 |
| `expired` | 結算過期 | 終態；不扣庫存、不發獎 |
| `accepted` | **本版不寫入** | 保留給以後的物流延遲。v1 沒有運送時間，接受不得停在此態 |

`accepted` 留在 schema 的允許值裡，是為了以後「先接下、貨到再完成」不必再改欄位語意。本版若寫入 `accepted`，獎勵會停在途中，和「接受即結算」矛盾，因此生成、接受、過期、拒絕都不得產生這個狀態。

接受（單一資料庫交易，冪等）：

1. 鎖住該列。狀態必須仍是 `pending`。若已是 `completed`、`rejected` 或 `expired`，直接結束：不扣庫存、不發獎、不改狀態、不追加第二筆歷史。
2. 檢查庫存 ≥ `required_items` 的每一項絕對數量。不足則整筆回滾，狀態保持 `pending`。
3. 扣除這些絕對數量（走 `inventory` 同一寫入入口）。
4. 發放 `rewards_snapshot`。
5. 寫入 `ai_order_history`（`pending` → `completed`）。
6. 把狀態改為 `completed`。
7. 提交。

任一步失敗則整筆回滾。拒絕：`pending` → `rejected`，不扣庫存；已不是 `pending` 則不再改狀態。過期：結算看到 `pending` 且目前遊戲秒 ≥ `expires_game_sec` 時改為 `expired`。

---

## 5. 資料表

設計用 SQL，不是遷移腳本。開工後 schema 以 Prisma 為準，欄位語意跟隨本檔。訂單四張表：`ai_order_rules`、`ai_order_defs`、`player_ai_orders`、`ai_order_history`。另加 `player_ai_order_scans`，只存確定性掃描游標，不是第五種訂單。現階段不建表。

`spawn_bucket` 是確定性生成用的時間片：遊戲小時桶 `floor(遊戲秒 / 3600)`。1 遊戲小時 = 3600 遊戲秒 = 1 現實分鐘。它和 `(player_id, rule_id)` 組成冪等鍵。`last_scanned_bucket` 記下這條規則已經掃到哪一桶；跳過的桶沒有訂單列，不能靠 `max(spawn_bucket)` 回推。

```sql
-- 設計約定（非遷移腳本）。本階段不執行。

CREATE TABLE ai_order_rules (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  source                TEXT NOT NULL, -- npc_merchant | guild | city | event | season
  stage                 TEXT NOT NULL, -- newbie | early | mid | late | endgame
  rate_per_game_hour    NUMERIC NOT NULL, -- 每遊戲小時機率；現實每小時期望次數 = 此值 × 60
  max_active_orders     INTEGER NOT NULL CHECK (max_active_orders >= 0),
  is_active             BOOLEAN NOT NULL DEFAULT FALSE,
  released_in_version   TEXT NOT NULL,
  metadata              JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE ai_order_defs (
  id                    TEXT PRIMARY KEY,
  code                  TEXT NOT NULL UNIQUE,
  rule_id               TEXT NOT NULL REFERENCES ai_order_rules (id),
  source                TEXT NOT NULL,
  consume               JSONB NOT NULL, -- 取樣指引：band + ratio 區間。不是倉庫件數
  rewards               JSONB NOT NULL, -- kind + multiplier
  duration_game_sec     INTEGER NOT NULL CHECK (duration_game_sec >= 1), -- 遊戲秒
  is_active             BOOLEAN NOT NULL DEFAULT FALSE,
  released_in_version   TEXT NOT NULL
);

CREATE TABLE player_ai_orders (
  id                    TEXT PRIMARY KEY,
  player_id             TEXT NOT NULL,
  def_id                TEXT NOT NULL REFERENCES ai_order_defs (id),
  rule_id               TEXT NOT NULL REFERENCES ai_order_rules (id),
  spawn_bucket          BIGINT NOT NULL, -- 遊戲小時桶 floor(遊戲秒 / 3600)；冪等時間片
  status                TEXT NOT NULL CHECK (status IN (
                          'pending', 'accepted', 'completed', 'rejected', 'expired'
                        )),
                        -- v1 只寫 pending | completed | rejected | expired
                        -- accepted 保留給以後物流延遲，本版禁止寫入
  required_items        JSONB NOT NULL, -- 絕對數量，例如 [{"item_id":"wheat","quantity":100}]
  rewards_snapshot      JSONB NOT NULL,
  created_game_sec      BIGINT NOT NULL,
  expires_game_sec      BIGINT NOT NULL,
  UNIQUE (player_id, spawn_bucket, rule_id)
);

CREATE TABLE ai_order_history (
  id                    TEXT PRIMARY KEY,
  order_id              TEXT NOT NULL,
  player_id             TEXT NOT NULL,
  from_status           TEXT NOT NULL,
  to_status             TEXT NOT NULL, -- v1：completed | rejected | expired
  payload               JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL -- 稽核時刻，不是結算公式的輸入
);

-- 確定性掃描游標。不是訂單單據。
-- 達上限而跳過的桶不會出現在 player_ai_orders，沒有這一列就無法分辨「已擲過且決定不生」。
CREATE TABLE player_ai_order_scans (
  player_id             TEXT NOT NULL,
  rule_id               TEXT NOT NULL REFERENCES ai_order_rules (id),
  last_scanned_bucket   BIGINT NOT NULL,
  PRIMARY KEY (player_id, rule_id)
);
```

冪等鍵：`UNIQUE (player_id, spawn_bucket, rule_id)`。結算再次跑到同一桶時，列已存在就跳過插入。游標 `last_scanned_bucket` 在同一交易推進；重放同一窗口時區間是空的，不會再擲骰。`created_at` 只供稽核，不參與「同輸入同結果」。`required_items.quantity` 是件數；`consume` 上的 0.10–0.30 是生成當下的比例帶，兩者不是同一個數。

---

## 6. JSON 範例

四則的 `duration_game_sec`、獎勵倍率、消耗帶端點維持原數值。歸屬依機制原文：**城市穀物、商人金屬、公會食物、節慶**。物品目錄尚未建立（[0003](0003-tiers-and-types.md) 只在說明裡舉「小麥」為例，沒有 `items.code`）。下列 `item_id` 都是示意，尚未進物品目錄。

`duration_game_sec` 是遊戲秒。旁註用第 2.1 節的 1:60，不把遊戲秒當成現實秒。

### 城市穀物

86400 遊戲秒 = 1440 現實秒 = 24 現實分鐘 = 1 遊戲日。

```json
{
  "id": "def_city_grain",
  "rule_id": "rule_city_newbie",
  "source": "city",
  "consume": [{ "item_id": "wheat", "band": "small", "ratio_min": 0.10, "ratio_max": 0.30 }],
  "rewards": [{ "kind": "gold", "multiplier": 1.5 }],
  "duration_game_sec": 86400
}
```

`consume` 是取樣帶。生成後寫入玩家列的是絕對件數，例如當時持有 1000、`ratio = 0.10`：

```json
{
  "required_items": [{ "item_id": "wheat", "quantity": 100 }]
}
```

這裡的 100 是 100 件小麥，不是 100%，也不是把 small 帶印在訂單上。`wheat` 對應文件舉例裡的「小麥」，不是已登錄物品。

### 商人金屬

43200 遊戲秒 = 720 現實秒 = 12 現實分鐘 = 0.5 遊戲日。

```json
{
  "id": "def_merchant_metal",
  "rule_id": "rule_npc_early",
  "source": "npc_merchant",
  "consume": [{ "item_id": "metal", "band": "large", "ratio_min": 0.60, "ratio_max": 0.90 }],
  "rewards": [{ "kind": "resource", "multiplier": 1.2 }],
  "duration_game_sec": 43200
}
```

`metal` 是示意 id。生成時同樣把 `floor(持有量 × ratio)` 寫成 `required_items` 的絕對件數；上列 0.60–0.90 不是件數。

### 公會食物

172800 遊戲秒 = 2880 現實秒 = 48 現實分鐘 = 2 遊戲日。

```json
{
  "id": "def_guild_food",
  "rule_id": "rule_guild_mid",
  "source": "guild",
  "consume": [{ "item_id": "food", "band": "medium", "ratio_min": 0.30, "ratio_max": 0.60 }],
  "rewards": [{ "kind": "reputation", "multiplier": 1.0 }],
  "duration_game_sec": 172800
}
```

`food` 是示意 id。

### 節慶

604800 遊戲秒 = 10080 現實秒 = 168 現實分鐘 = 7 遊戲日。

```json
{
  "id": "def_festival_event",
  "rule_id": "rule_event_late",
  "source": "event",
  "consume": [{ "item_id": "festival_goods", "band": "all", "ratio_min": 1.0, "ratio_max": 1.0 }],
  "rewards": [{ "kind": "special", "multiplier": 2.0 }],
  "duration_game_sec": 604800
}
```

`festival_goods` 是示意 id。`all` 的 ratio 固定為 1，生成時的絕對數量等於當時持有量（持有量為 0 則不生成該行），仍然是件數，不是在介面上顯示 100%。

---

## 7. 生成規則與頻率

遊戲小時桶（`spawn_bucket`）= `floor(遊戲秒 / 3600)`。1 遊戲小時 = 3600 遊戲秒 = 1 現實分鐘。

種子（正式規則。結算路徑禁止 `Math.random()`，也禁止把雜湊算法留成實作自選）：

```
plain   = playerId + "\n" + spawnBucket + "\n" + ruleId
digest  = SHA-256(UTF-8(plain))    // 32 bytes，大端
u_spawn = digest 前 8 bytes 的 uint64 / 2^64     // [0, 1)
u_pick  = digest 接著 8 bytes 的 uint64 / 2^64   // 多筆定義時選哪一筆
```

`u_spawn < rate_per_game_hour` 才嘗試生成一張。每一條啟用中的規則各自擲一次；機率掛在該規則上，不是全階段共用一顆骰子。

消耗行的比例另算，避免和「生不生成」共用同一個數、也避免再呼叫隨機源：

```
u_ratio = SHA-256(UTF-8(plain + "\n" + item_id)) 前 8 bytes 的 uint64 / 2^64
ratio   = ratio_min + (ratio_max - ratio_min) × u_ratio
```

`ratio_min = ratio_max` 時（`all` 帶）比例就是 1，與 `u_ratio` 無關。技術棧只有 TypeScript，上述除法用同一種 64 位整數轉 `[0, 1)` 的寫法，同輸入同結果。

該玩家在**這條規則**下的 `pending` 張數已達該規則的 `max_active_orders` 則本桶不生成。唯一鍵已存在則不生成。一條規則、一個桶最多一張。若該規則有多筆 `is_active` 定義，將這些定義的 `id` 做字典序排序，用 `floor(u_pick × 筆數)` 取一筆。

**頻率表的第一欄是每遊戲小時機率。乘上 60 才是現實每小時期望次數。** 表內數字是該階段規則的預設；`max_active_orders` 同樣是這一條規則的同時 `pending` 上限，不是全玩家一條總帽。

| 階段 | `stage` | 每遊戲小時機率 | 現實每小時期望次數（× 60） | `max_active_orders` |
| --- | --- | --- | --- | --- |
| 新手 | `newbie` | 0.05 | 3 | 3 |
| 早期 | `early` | 0.1 | 6 | 5 |
| 中期 | `mid` | 0.2 | 12 | 8 |
| 後期 | `late` | 0.3 | 18 | 10 |
| 終局 | `endgame` | 0.5 | 30 | 15 |

`max_active_orders` 只限制該玩家、該規則下仍為 `pending` 的張數。它不取代機率，也不把機率改成現實每小時。

獎勵倍率相對該筆消耗算出的基礎獎勵。基礎值的絕對公式留給以後的數值表，不在本檔另造一套生產公式。

| 種類 | 倍率 |
| --- | --- |
| 資源 | 1.2× |
| 金幣 | 1.5× |
| 聲望 | 1.0× |
| 特殊 | 2.0× |
| 經驗 | 1.0× |

---

## 8. 結算流程

時機與生產相同：讀取或操作該玩家的訂單時懶結算。伺服器注入本次時刻。不對每個遊戲秒跑迴圈，也不為訂單單獨掛 Redis 佇列或 WebSocket。

純函數只做判斷。寫入在交易裡，而且冪等。

### 8.1 生成

1. 伺服器注入本次遊戲秒。這個窗口就是生產結算已經先裁切真實差、再 × 60 的那段；訂單不另定離線上限，也不掃上限以外已關閉的區間。`current_bucket = floor(遊戲秒 / 3600)`。
2. 只處理 `is_active = true` 的規則與定義。預設全關，MVP 不產生列。規則仍關閉時不寫掃描游標，因此日後打開不會把關閉期間的舊桶一次補出來。尚無游標時，起點就是 `current_bucket`（等同 `last_scanned_bucket = current_bucket - 1`），只處理當前這一桶，不回補離線窗口裡更早的桶。
3. 已有游標時，桶依升序，從 `last_scanned_bucket + 1` 到 `current_bucket`。若離線 cap 把更早的區間關掉，起點改為窗口內的第一桶；被關掉的桶不生成，游標先拉到窗口起點的前一桶再往下掃。無游標時不套用這段回補。升序寫死，避免上限綁定時先掃新桶或舊桶得到不同的一批訂單。
4. 每個 `(spawn_bucket, rule)`：唯一鍵已存在則不插入。該玩家在這條規則下的 `pending` 已達 `max_active_orders` 則不插入。不論插不插入，這個桶都算掃過。
5. 需要擲骰時只用第 7 節的 SHA-256 切法，決定是否生成、選哪一筆定義，以及帶內 `ratio`。不得改讀 `Math.random()` 或其他非確定性源。
6. `required_items` 寫入絕對件數。持有量為 0，或 `floor(持有量 × ratio)` 為 0 的物品不產生行；若沒有任何行，則本桶不插入。
7. 插入則為 `pending`。`expires_game_sec = created_game_sec + duration_game_sec`。`rewards_snapshot` 用定義上的倍率凍結。`created_game_sec` 取該桶開始的遊戲秒（`spawn_bucket × 3600`），不取讀取當下的牆鐘，否則同一桶早晚結算會得到不同的到期點。
8. 同一交易把 `last_scanned_bucket` 設為 `current_bucket`。重放時區間是空的，不再生成。唯一鍵是第二道保險。

### 8.2 過期

1. 同一輪結算掃描仍為 `pending`、且目前遊戲秒 ≥ `expires_game_sec` 的列。過期不看 `is_active`：規則關掉之後，已經發出的 `pending` 仍會到期（見第 10 節），避免關旗標後列永遠停在 `pending`。
2. 改為 `expired`，寫歷史。不扣庫存、不發獎。
3. 已是 `expired` 的列不再改、不再寫第二筆副作用。

### 8.3 接受即完成

1. 玩家請求接受。v1 沒有運送延遲，不進入 `accepted`。
2. 交易內確認狀態仍是 `pending`，且庫存足夠支付 `required_items` 的絕對數量。
3. 扣資源、發獎、寫歷史、狀態改為 `completed`，然後提交。
4. 重複請求：狀態已不是 `pending` 時，回傳既有結果，不得再扣、再發。

### 8.4 拒絕

1. 僅 `pending` 可拒絕。
2. 改為 `rejected`，寫歷史。不扣庫存、不發獎。
3. 重複拒絕不得把終態再改一次，也不得補扣。

沒有玩家接受時，第 8.1 與第 8.2 節不得把訂單改成 `completed`。

---

## 9. 與生產、庫存、科技、建築

- **生產**：訂單不生成 `production_methods`，不修改生產規則。生產鏈仍聽 [production-system.md](production-system.md)。訂單只消耗已入帳庫存。消耗速率不得靠改生產公式來硬壓。
- **庫存**：`required_items` 在生成時寫成絕對數量；接受時經 `inventory` 扣除。預覽不得寫回。
- **科技**（係數未鎖定，只定方向；不在 MVP）：
  - 談判術：調整獎勵倍率或可接受條件。
  - 物流學：以後若啟用運送延遲，才會用到保留的 `accepted`；v1 只調整時效或 `max_active_orders`。
  - 市場學：調整金幣獎勵。
  - 聲望學：調整聲望獎勵。
- **建築**（不在 MVP；與訂單來源對應，不進現有模組邊界）：
  - 市場：商人與金幣類訂單的承接點。
  - 倉庫：持有量是比例取樣的基數；扣的仍是絕對件數。
  - 公會大廳：公會來源。
  - 大使館：城市來源。

---

## 10. 數值平衡

| 項 | 決定 |
| --- | --- |
| 獎勵倍率 | 資源 1.2×、金幣 1.5×、聲望 1.0×、特殊 2.0×、經驗 1.0× |
| 消耗帶 | 少量 10–30%、中量 30–60%、大量 60–90%、全部 100%（相對生成當時持有量） |
| 寫入訂單的數量 | 絕對件數。範例 100 小麥是 100 件 |
| 消耗速率 | 目標約為生產速率的 **30–50%** |
| 核心循環 | 訂單不得破壞核心生產循環。過猛或尚未準備好時，把規則或定義的 `is_active` 關掉 |
| 引擎 | 30–50% 是調規則時的目標，不另寫一條硬頂公式去改生產結算 |

`is_active` 預設 `false`。關閉後不再生成；已存在的 `pending` 仍可照第 8 節過期、拒絕或接受，避免關旗標時把列留在無法結束的狀態。若要連已發出的單一起停用，另開資料遷移，不在本版隱含。

---

## 11. 可擴展（未做）

下列項目維持未做。`is_active` 保持關閉，直到另開文件把它們納入範圍：

- 玩家發佈
- 談判
- 聯合
- 連鎖
- 賽季（營運輪替；資料欄 `source = season` 先留）
- 公會共享
- 物流延遲（屆時才使用 `accepted`；本版接受即 `completed`）

未來的 `orders` 模組只負責這張狀態機與冪等鍵。扣庫與發放入庫存的寫入仍走 `inventory`。不把 Redis 或 WebSocket 寫成上線條件。

---

## 12. 驗證清單

設計已納入下列項。程式尚未開工，本清單核的是文件決定。

- [x] R-AI1–R-AI6 已寫入。玩家可見資訊不出現「假」。
- [x] 來源五類、獎勵五類、消耗四帶（生成時的持有量取樣）已寫入。
- [x] `required_items` 是絕對數量；城市穀物範例的 100 小麥是 100 件，不是百分比。件數為 0 不生成該行。
- [x] 四張訂單表，外加掃描游標 `player_ai_order_scans`。v1 狀態流轉 `pending` → `completed` / `rejected` / `expired`。`accepted` 保留但本版不使用。
- [x] `spawn_bucket` 作為遊戲小時桶，與 `(player_id, rule_id)` 唯一。跳過的桶靠 `last_scanned_bucket` 記為已掃，升序補算。
- [x] 四則範例保留 `duration_game_sec`：86400、43200、172800、604800，並註明等價現實秒與現實分鐘。歸屬為城市穀物、商人金屬、公會食物、節慶。
- [x] 物品 id 為示意，尚未進物品目錄。
- [x] 頻率表：0.05/3/3、0.1/6/5、0.2/12/8、0.3/18/10、0.5/30/15。機率 × 60 = 現實每小時期望。
- [x] 獎勵倍率與 30–50% 生產速率目標已寫；可用 `is_active` 關閉。
- [x] 生成與接受皆冪等；結算路徑不使用 `Math.random()`。雜湊鎖定 SHA-256 與位元組切法。
- [x] 懶結算，狀態在 PostgreSQL；不以 Redis / WebSocket 為前提；不每遊戲秒跑迴圈。
- [x] 不改 ADR 0001 模組邊界；`orders` 僅標為未來，現階段不實作。
- [x] 不在 MVP。不另定離線上限；8 現實小時仍等於 1,728,000 遊戲秒。

---

## 13. 範圍聲明

本機制是核心循環之後的資源出口，**不在 MVP**。MVP 仍是：農業、5–10 物品、離線結算、存檔；無登入、無玩家對玩家市場、無排行榜。

現階段只定義，不實作：不建表、不寫 Prisma、不掛 NestJS 模組、不開 API、不做模擬器、不做訂單 UI。
