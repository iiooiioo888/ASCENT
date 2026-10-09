# 可玩產業擴充目錄

| 項 | 值 |
| --- | --- |
| 狀態 | 可玩資料（`released_in_version = industry-1`） |
| 不改 | [mvp-agriculture-catalog.md](mvp-agriculture-catalog.md) 的 8 物品／7 規則／5–10 方式 |
| 合併入口 | `packages/shared/src/playable-catalog.ts` |
| 種子 | `apps/api/prisma/seed.ts` 寫入可玩目錄；開局仍只預放農業建築 |

本檔是農業切片之外的**第一包**產業。它不是目標首發的 69 物品，也不把 T2 同位素打開。層級仍聽生產系統：T 不吃 P、P 一次只升一級、方式由規則生成。

農業佔槽上限是 **12**（`PLAYER_BUILDING_SLOT_CAP`；倉不佔槽；田早期上限 2，收 8 麵包後 12）。下表建築**不佔該槽**，每種最多 1 座；槽滿之後仍可放置。牧場與食品廠佔這 12 槽，且尚未寫進本表（見 [next.md](../next.md) 序 3）。

---

## 建築

| id | 顯示名 | 系統 | 方式 |
| --- | --- | --- | --- |
| `bdef_mine` | 礦坑 | mining | 鐵礦、銅礦、煤、硫磺（無輸入） |
| `bdef_quarry` | 採石場 | mining | 石、黏土、砂（無輸入） |
| `bdef_forest` | 林地 | timber | 原木（無輸入） |
| `bdef_smelter` | 冶煉爐 | mining | 煉鐵、木炭煉鐵、煉銅、煉焦、煉鋼 |
| `bdef_kiln` | 窯 | chemical | 磚、玻璃、石灰、秸稈燒炭、原木燒炭、混凝土 |
| `bdef_chem_works` | 化工廠 | chemical | 晒鹽、粗酸、鹼、肥料 |
| `bdef_workshop` | 工坊 | industry | 木板、釘、銅線、工具、齒輪、玻璃器皿 |
| `bdef_machine_shop` | 機械廠 | industry | 機械、蒸汽機 |
| `bdef_boiler` | 鍋爐 | energy | 蒸汽 |

## 主鏈

```
鐵礦 + 煤 → 鐵錠 → 鋼（鐵錠 + 焦炭）
煤 → 焦炭 → 蒸汽
鋼 + 齒輪 + 蒸汽 → 蒸汽機
齒輪 + 銅線 + 工具 → 機械
水 → 鹽；石 + 煤 → 石灰；鹽 + 石灰 → 鹼
飼料 + 鹼 → 肥料
秸稈或原木 → 木炭 → 可代替煤煉鐵
```

物品 30：T 9、P1 9、P2 9、P3 3（機械、蒸汽機、肥料）。沒有啟用中的 T2。

商行賣出錠、鋼、磚、玻璃、木板、炭、焦、釘、工具、肥料、機械、蒸汽機；可買煤與鐵礦。價目已簽核，與 `packages/shared/src/market-config.ts` 的 `DEFAULT_MARKET_PRICES` 同一份。

既有 SQLite 要重新執行種子，新建築才會出現在空地。
