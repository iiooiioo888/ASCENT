# 工程 MVP：農業切片目錄（命名、槽位、驗證對照）

| 項 | 值 |
| --- | --- |
| 狀態 | **確定**（文件槽位與 ID；**不是**數值定案） |
| 工程驗收 | [mvp.md](../mvp.md) |
| 規則法源 | [production-system-v2.md](production-system-v2.md) §15 |
| 產品法源 | [系統定義 v1.0](../system-definition.md) |
| 本階段 | 只鎖農業切片 ID。程式與種子已在倉庫 |

本檔把 MVP「農業 5–10 物品／3–5 建築／5–10 方式」落到**可驗證的 ID 槽位**。產率、工時倍數、隊列長度仍留給開工後的數值表；此處只鎖結構。禁止把本檔擴成礦業／化工，也禁止把 [launch-scope.md](launch-scope.md) 的 69 物品縮進來。牧場、蛋、奶、食品廠、蛋糕不寫進本表，目錄補洞見 [next.md](../next.md) 序 3。礦、化、工、能源、林木見 [industry-expansion-catalog.md](industry-expansion-catalog.md)。

衝突時：入帳 cap 聽系統定義 §5；規則語意聽 GDD 全文；驗收聽 mvp.md。

---

## 1. 規模鎖定

| 槽 | 本切片數量 | MVP 閉區間 |
| --- | --- | --- |
| 物品 | **8** | 5–10 |
| 建築定義 | **5**（含水井。佔槽上限另見 P-D3＝**12**，倉不佔槽；本列仍只鎖這 5 個定義） | 3–5 |
| 規則 | **7**（含汲水／留種） | ≤ 方式數 |
| 方式（由規則生成） | **8**（預估；實作時 5–10） | 5–10，每筆有 `rule_id` |
| 系統 | 僅 `agriculture` | 不得啟用礦／化／通用／能源大包 |
| T2 同位素 | 全部 `is_active=false` | V-ACTIVE |

本表物品與規則的 `released_in_version` 一律 `"mvp"`。可玩擴充用 `industry-1`，不寫進本表。開局庫存仍給足種子與水；**資源循環（RL-BE-1）**另加水井汲水與田留種以解軟卡死。汲水／留種數值已於 MVP 簽核（見 §5）。

---

## 2. 類型

MVP 最少兩個 `item_types`，足夠掛 T／P，不必開完整屬性包。

| `id` | `code` | `name` | `layer` 用途 |
| --- | --- | --- | --- |
| `it_crop` | `crop` | 作物 | T 物質 |
| `it_produce` | `produce` | 農產加工 | P 產物 |

工程種子已寫入 **`item_properties` 定義**（`moisture` 含水、`purity` 純度，對齊 GDD 範例）；`items.properties` 與 `item_type_properties` 仍留空，公式／數值平衡後續再填。稀有度／品質欄可省略（mvp.md 非目標）。

---

## 3. 物品命名（可改顯示名，不可改層與 DAG）

層級由規則輸入推導，表內 `derived_tier` 是快取，必須與推導一致（V-TIER）。

| `id` | `code` | 顯示名（可改） | `type_id` | `layer` | `derived_tier` | 角色 |
| --- | --- | --- | --- | --- | --- | --- |
| `item_seed_wheat` | `seed_wheat` | 小麥種子 | `it_crop` | T | 1 | 種植輸入 |
| `item_wheat` | `wheat` | 小麥 | `it_crop` | T | 1 | 田產出；磨坊輸入 |
| `item_straw` | `straw` | 秸稈 | `it_crop` | T | 1 | 田副產；飼料輸入 |
| `item_water` | `water` | 水 | `it_crop` | T | 1 | 種植／加工輸入（農業切片內的 T，不當能源大包） |
| `item_flour` | `flour` | 麵粉 | `it_produce` | P | 1 | 小麥加工 |
| `item_feed` | `feed` | 飼料 | `it_produce` | P | 1 | 秸稈＋小麥 |
| `item_dough` | `dough` | 麵團 | `it_produce` | P | 1 | 麵粉＋水 |
| `item_bread` | `bread` | 麵包 | `it_produce` | P | 2 | 麵團加工；閉環終產 |

DAG（物品依賴，不是繼承）：

```
water, seed_wheat → wheat + straw
wheat → flour
straw + wheat → feed
flour + water → dough
dough → bread
```

約束核對：

- T 物品彼此可互為輸入；**沒有任何 T 以 P 為輸入**（V-T-P）。
- P1（麵粉、飼料、麵團）只吃 T 或同層允許的輸入；麵包為 P2，一次 +1（V-SKIP、V-DOWN）。
- 無產業循環當「規則繼承循環」；物品互為 I/O 可以，但本切片規則繼承全是根規則、無 parent（V-CYCLE、V-INH）。

---

## 4. 建築槽位

| `id` | `code` | 顯示名 | `system_code` | MVP 能力 |
| --- | --- | --- | --- | --- |
| `bdef_field` | `field` | 田 | `agriculture` | 綁種植方式；持有 `lastSettledAt` |
| `bdef_silo` | `silo` | 倉 | `agriculture` | 不生產亦可；若生產則只收／存。MVP 可當純展示倉，**不計入必須開工的 3 座**，但佔 4 定義之一 |
| `bdef_mill` | `mill` | 磨坊 | `agriculture` | 磨粉、拌飼料 |
| `bdef_oven` | `oven` | 爐 | `agriculture` | 和麵、烘烤 |
| `bdef_well` | `well` | 水井 | `agriculture` | 僅 `rule_draw_water`；**已拍板 D2**：開局預放 1 座 |

`can_upgrade` / `can_specialize` 目標欄可留預設，**MVP 不驗收**。`queue_limit` 建議常數 **1**。佔地／相鄰不做。運轉中確定性耐久磨損已進結算純函數。

玩家實例至少能放置田、磨坊、爐各一座，才構成種植→加工→烘烤閉環；水井汲水與田留種已拍板並存。倉可延後放置。

---

## 5. 規則槽位（方式由規則生成）

`duration_game_sec` 下列已與 `packages/shared/src/agriculture-catalog.ts` 簽核一致。公式欄可空物件；若寫公式只准白名單。

| `id` | `code` | 輸入 | 輸出 | 工時（遊戲秒） | 生成方式（預估） |
| --- | --- | --- | --- | --- | --- |
| `rule_grow_wheat` | `grow_wheat` | 種子 1、水 1 | 小麥 2、秸稈 1 | 3600 | 標準種植；可再生成「省水」變體 → 2 筆 |
| `rule_mill_flour` | `mill_flour` | 小麥 2 | 麵粉 1 | 1800 | 1 筆 |
| `rule_mix_feed` | `mix_feed` | 秸稈 2、小麥 1 | 飼料 1 | 1200 | 1 筆 |
| `rule_make_dough` | `make_dough` | 麵粉 1、水 1 | 麵團 1 | 600 | 1 筆 |
| `rule_bake_bread` | `bake_bread` | 麵團 1 | 麵包 1 | 1200 | 1–2 筆 |
| `rule_draw_water` | `draw_water` | （無） | 水 ×5 | 600 | 1 筆 `method_draw_water_default` |
| `rule_save_seed` | `save_seed` | 小麥 ×2 | 種子 ×1 | 1800 | 1 筆 `method_save_seed_default` |

合計 **7** 條根規則。方式預估：

| `rule_id` | 優化維度（資料，非引擎寫死） | 方式數 |
| --- | --- | --- |
| `grow_wheat` | 預設；可選 `water_saving`（耗水↓、工時↑） | 2 |
| `mill_flour` | 預設 | 1 |
| `mix_feed` | 預設 | 1 |
| `make_dough` | 預設 | 1 |
| `bake_bread` | 預設；可選 `batch`（同輸入倍率，若生成器支援） | 1–2 |
| `draw_water` | 預設 | 1 |
| `save_seed` | 預設 | 1 |

方式合計必須落在 **5–10**。禁止手寫沒有 `rule_id` 的 `production_methods`（V-METHOD）。`parent_rule_id` 本切片全 `NULL`，繼承深度 0。

建築綁定（資料，非硬編碼）：

| 建築 | 可選方式來源規則 |
| --- | --- |
| 田 | `grow_wheat`、`save_seed` |
| 磨坊 | `mill_flour`、`mix_feed` |
| 爐 | `make_dough`、`bake_bread` |
| 水井 | `draw_water` |
| 倉 | 無開工方式 |

---

## 6. 驗證器對照（農業切片必須能過）

法源：[GDD §15](production-system-v2.md#15-驗證清單)、[濃縮契約 §9](../production-system.md)。本表說明**本切片如何滿足**，不另寫一套代碼。

| 代碼 | MVP 切片怎麼過 | 刻意不測／延後 |
| --- | --- | --- |
| V-SKIP | 麵包 P2 只吃 P1 麵團；T 無升到 T2 | 礦業跳級案例 |
| V-DOWN | 無高層餵低層 | — |
| V-T-P | 四種 T 皆不引用 P | — |
| V-CYCLE | 規則無 parent；物品 DAG 如上 | 深繼承樹 |
| V-ID | 上表 ID 全部互相引用存在 | 目標首發關閉包 |
| V-OUT | 每條規則 ≥1 輸出 | — |
| V-TIME | 占位工時皆 ≥1 整數 | 工時帶平衡 |
| V-TIER | T 皆 1；P 麵粉／飼料／麵團=1、麵包=2 | 手填衝突案例作為負測可另加 |
| V-INH | 無繼承；深度 0 ≤ 10 | R-INH 覆寫案例 |
| V-FORMULA | 公式空或白名單 | 新函數 L3 |
| V-METHOD | 5–10 筆皆指回上列規則 | 孤兒方式必須驗證失敗（負測） |
| V-OFFLINE | 結算 cap `maxOfflineRealSec=28800` → `1728000` 遊戲秒 | 用 `86400` 當 cap **必須失敗** |
| V-ACTIVE | 僅本切片 `is_active`；T2 同位素關 | 開啟礦業 |

`POST /api/v1/validate` 對「目前已啟用目錄」跑上表。MVP 可延後此端點，但種子資料仍須能過同一清單。

負測（文件要求，開工時寫測試，現在不寫程式）：

1. 手寫無 `rule_id` 的方式 → V-METHOD 失敗。
2. 小麥規則輸出改為麵包（T 跳到 P2）→ V-SKIP 失敗。
3. 種植輸入改為麵粉 → V-T-P 失敗。
4. `max_offline_game_sec=86400` 當入帳 cap → V-OFFLINE 失敗。

---

## 7. 與結算、存檔

權威仍是 PostgreSQL：`player_buildings.last_settled_at`、`player_inventory`。進頁／開工／收取走同一懶結算入口。離線上限 **8 現實小時**。無登入、無玩家對玩家市場、無 WS、無 AI 訂單。NPC 商行不屬於本切片。

本檔不改時間公式：

```
gameTime = startGameTime + (now - startRealTime) / 1000 × 60
cappedRealDeltaSec = min(rawRealDeltaSec, 28800)
```

---

## 8. 下一步

本檔鎖的是工程 MVP 農業切片（8 物品）。其後的牧場、食品廠與其他產業不寫進本表。任務見 [next.md](../next.md)。
