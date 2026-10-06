# GDD 0004：生產方式、規則、公式、繼承、優化（節 5–9）

正式全文：[production-system-v2.md](production-system-v2.md) §5–9。濃縮契約：[../production-system.md](../production-system.md) §5–9。本分冊為欄位級正文。純計算物件放在 NestJS `rules` 與 `simulation`，不開 HTTP。見 [architecture/overview.md](../architecture/overview.md)。

## 5. 生產方式

兩張表，一個方向：

| 表 | 誰寫 | 誰讀 |
| --- | --- | --- |
| `production_rules` | 設計資料 | `RuleEngine`、`Validator`、`MethodGenerator` |
| `production_methods` | **只由** `MethodGenerator` 從規則生成 | 建築開工、結算、UI |

禁止手寫與規則不一致的 `production_methods`。方式必須能指回一條規則（`rule_id`）。引擎不修改規則列。

`MethodGenerator` 讀已解析且驗證通過的規則，沿優化維度展開為一筆或多筆 `production_methods`。同一規則可生成多種方式，每筆都必須 `rule_id` 指回來源。

`LoopGenerator` 在已生成方式上標出核心循環（農業／礦業／化工／通用／能源）。物品互為輸入輸出可以成**產業迴圈**；規則繼承、層級依賴、公式參照仍禁止循環。

| 對象 | 決策 |
| --- | --- |
| 已生成的 `production_methods` 種類 | 引擎**無硬頂** |
| 單一建築開工隊列 | **有限制**（數字待數值表；MVP 可先鎖很小常數） |
| 切換方式 | 可切換，**有成本**。順序：先結算當前、扣成本、再套用新方式。MVP 可先不做切換 |
| 半自動循環 | 目標首發；MVP 可只做開工後依時間產出、進頁收取 |

### 5.1 鐵錠三種方式範例（契約示意，非平衡定案）

產出：`item_iron_ingot`（P1；輸入全是 T）。三種方式由規則生成，禁止手寫孤兒。

| 方式 | 來源規則 | 典型輸入 | 工時（相對 `base`） | 目標 |
| --- | --- | --- | --- | --- |
| 基礎冶煉 `method_iron_ingot_basic` | `rule_iron_smelting_basic` | 鐵礦 + 煤 | ×1 | 低門檻、慢 |
| 高爐 `method_iron_ingot_blast` | `rule_iron_smelting_blast` | 鐵礦 + 焦炭 + 熔劑 | ×0.7 | 更快、吃能源 |
| 直接還原 `method_iron_ingot_direct` | `rule_iron_smelting_direct` | 更高純度鐵礦 + 還原氣 | ×1.2 | 高純度／高產率 |

## 6. 規則

`production_rules` 是唯一的配方語意來源。

| 欄位 | 約束 |
| --- | --- |
| `code` | 唯一穩定 ID，如 `rule_iron_smelting_basic` |
| `parent_rule_id` | 0 或 1 個；繼承見第 8 節 |
| `inputs` | JSONB 陣列；每項含物品 ID、數量公式或常數 |
| `outputs` | JSONB 陣列；**至少一個**產出 |
| `duration_game_sec` | 基準工時，正整數（**遊戲秒**），對應公式變數 `base` |
| `formulas` | JSONB；只准白名單。可含 `duration`，求值後必須是正整數 |
| `compositions` | JSONB 規則 ID 陣列；組合約束（R-INH4），預設 `[]` |
| `overrides` | 子規則欄位級覆寫 |
| `is_active` | false 則不得生成已啟用方式 |
| `released_in_version` | 未到版本不得生效 |

時間單位是**遊戲秒**。結算時用裁切後的真實差 × 60 得到可用遊戲秒，再套工時（`formulas.duration` 若存在則用求值結果，否則 `duration_game_sec`）。建議落在 [0003 §3.5](0003-tiers-and-types.md) 層級工時帶。

`inputs` / `outputs` 元素至少含 `item_id`（或穩定 `key` + `itemId`）、數量（常數或公式名）。

解析順序：根 → 子覆寫 → 驗證器 → `MethodGenerator`。

### 6.1 規則 JSON 範例（契約示意，非平衡定案）

```json
{
  "id": "rule_iron_smelting_basic",
  "code": "rule_iron_smelting_basic",
  "parent_rule_id": null,
  "inputs": [
    {"key": "ore", "item_id": "item_iron_ore", "qty": 1},
    {"key": "fuel", "item_id": "item_coal", "qty": 1}
  ],
  "outputs": [
    {"item_id": "item_iron_ingot", "qtyFormula": "input.ore * item.yield"}
  ],
  "duration_game_sec": 3600,
  "formulas": {
    "duration": "base",
    "yield": "input.ore * item.yield",
    "energy": "base * tier"
  },
  "compositions": [],
  "overrides": {},
  "is_active": true,
  "released_in_version": "v1.0"
}
```

## 7. 公式

只允許下列運算與函數，其餘一律驗證失敗：

| 類 | 允許 |
| --- | --- |
| 運算 | `+` `-` `*` `/` |
| 函數 | `min` `max` `floor` `ceil` `round` `if` |
| `if` 形 | `if(cond, a, b)`，`cond` 為比較（`>` `<` `>=` `<=` `==` `!=`） |

禁止：自訂函數、迴圈、指派、存取未聲明變數、除以常數 0。`/` 的除數在求值時為 0 → 該次驗證／結算失敗，不寫庫。

| 前綴 | 含義 | 例 |
| --- | --- | --- |
| `item.X` | 主體／產出物品屬性 `X` | `item.purity` |
| `parent.X` | 繼承解析後，父規則的公式或欄位 `X` | `parent.duration` |
| `input.X` | 具名輸入的數量或屬性 | `input.ore` |
| `base` | 規則上的基準常數 | 基準工時 |
| `tier` | 產出物品的 `derived_tier` | 層級係數 |
| `level` | 建築或方式等級（沒有則 0） | 等級加成 |

未在白名單與該規則輸入／屬性中出現的名字 → 不可解析。

`if` 例：`if(item.purity >= 0.9, base, base * 2)`。

### 7.1 公式 JSON 範例（契約示意，非平衡定案）

```json
{
  "duration": "base",
  "yield": "input.ore * item.yield",
  "energy": "base * tier",
  "quality": "if(item.purity >= 0.9, 100, 80)"
}
```

`if` 例：`if(item.purity >= 0.9, base, base * 2)`。求值結果寫入結算，不回寫規則列。

## 8. 繼承

| ID | 規則 |
| --- | --- |
| R-INH1 | 單親：`parent_rule_id` 最多一個。繼承圖必須是 DAG，禁止循環。 |
| R-INH2 | 欄位繼承：子規則未覆寫的欄位，解析值等於父規則（遞迴到根）。 |
| R-INH3 | 欄位覆寫：只覆寫聲明欄位；合併後的完整規則必須通過驗證器。 |
| R-INH4 | 組合：多條規則同時約束同一產出時，用組合集合（全部通過才合法），**不用多親合併欄位**。 |
| R-INH5 | 可見性：父規則 `is_active=false` 或未到 `released_in_version` 時，子規則不得單獨生效。子規則可更嚴，不得比父更早解鎖。 |
| R-INH6 | **深度上限 10**：根為深度 0；從根走到本規則的**邊數** ≤ 10。超過驗證失敗，不得生成方式。 |

### 8.1 規則範例（契約示意，非平衡定案）

**`rule_iron_smelting_basic`（根）** — 產出鐵錠（P1）

| 欄 | 值 |
| --- | --- |
| 輸入 | `ore`＝鐵礦（T）、`fuel`＝煤（T） |
| 產出 | 鐵錠（P1 引導） |
| 工時 | `base`（正整數遊戲秒） |
| 產數 | `input.ore * item.yield` |
| 能耗 | `base * tier` |

**`rule_iron_smelting_blast`（父：basic）**

| 覆寫 | 例 |
| --- | --- |
| 工時 | `floor(parent.duration * 0.7)` |
| 能耗 | `parent.energy + item.heat` |
| 產數 | 繼承 |

**`rule_iron_smelting_direct`（父：basic）**

| 覆寫 | 例 |
| --- | --- |
| 工時 | `ceil(parent.duration * 1.2)` |
| 產數 | `input.ore * max(item.yield, parent.yield)` |
| 輸入 | 可收緊為更高純度 T（仍 ≤ 產出層，R-T2） |

## 9. 優化

`MethodGenerator` 沿下列維度展開。維度值來自規則資料（含繼承後的公式），不是引擎寫死的數值表。

| 優化維度 | 含義 | 進入結算 | 目標（設計意圖） |
| --- | --- | --- | --- |
| `duration` | 遊戲秒工時 | 是 | 快／慢路線可並存 |
| `yield` | 產出倍率 | 是 | 高產率常伴隨更嚴輸入或更長工時 |
| `energy` | 能源消耗／產出 | 是 | 能源成為核心循環約束 |
| `input_factor` | 輸入倍率 | 是 | 省料 vs 費料 |
| `byproduct` | 副產開關或比例 | 是 | 化工／礦業副產不另寫死函數 |
| `level` | 方式等級，公式變數 `level` | 是 | 與建築等級相乘，不是新的 T/P 層 |

方式種類無引擎硬頂；隊列有限。建築等級 `modifiers` 可再乘上 duration／yield／energy。專精、耐久、相鄰不在 MVP；耐久只影響效率、不歸零。

驗證失敗的規則不得生成方式，不得被建築選用。完整清單見 [0005](0005-schema-and-api.md)。

---

## 相關文件

| 文件 | 職責 |
| --- | --- |
| [GDD v2.0 §5–9](production-system-v2.md#5-生產方式) | 規則／方式／公式／繼承／優化全文 |
| [ADR 0003](../adr/0003-production-rules.md) | 規則作為架構約束 |
| [0005](0005-schema-and-api.md) | 驗證清單 |
