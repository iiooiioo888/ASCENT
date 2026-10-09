# 《帝國掘起》文件索引

| 項 | 值 |
| --- | --- |
| 版本 | 2026-10-08 |
| 狀態 | 本目錄仍是設計契約。工程 MVP 程式已在倉庫根目錄 `apps/`、`packages/shared`。 |

本檔是索引，不列入下方閱讀順序。

---

## 術語

| 術語 | 含義 |
| --- | --- |
| 帝國掘起 | 遊戲正式名稱（法源：[system-definition.md](system-definition.md)） |
| 規則驅動生產 | 引擎只認識規則與類型，永不修改；方式由規則生成 |
| 懶結算 | 不對每座建築每遊戲秒跑迴圈；真實差 × 60 一次補算 |
| `timeScale=60` | **1 真實秒 = 60 遊戲秒 = 1 遊戲分鐘**（禁止寫成 61）；遊戲 1 天 = 24 真實分鐘 |

---

## 鎖定常數（全庫只准這一套）

| 鍵 | 值 | 法源 | 不得另寫 |
| --- | --- | --- | --- |
| `timeScale` | `60` | ADR 0001、GDD 原稿 | `61`；每遊戲秒迴圈 |
| GDD 原稿 `maxOfflineGameSec` | `86400` | 日長＝1 遊戲日＝24 真實分鐘；**不入帳** | 從 GDD 刪掉；當入帳 cap |
| `tickIntervalRealMs` | `5000` | GDD 原稿；粗粒度 tick | 當成遊戲秒迴圈 |
| `gameDayGameSec` / `game_day_game_sec` | `86400` | 日長語意欄（承接原稿） | 不建此欄；當入帳 cap |
| `maxOfflineRealSec` | `28800` | 系統定義 §5（**8 現實小時**，入帳權威） | 用 86400／1440 裁切產能 |
| `Config.maxOfflineGameSec` | `1728000` | `28800 × 60`＝20 遊戲日（衍生） | 把此數寫進 GDD 冒充原稿 |

```
gameTime = startGameTime + (now - startRealTime) / 1000 × timeScale
```

**1 真實秒 = 60 遊戲秒 = 1 遊戲分鐘。遊戲 1 天 = 24 真實分鐘。** 時間算出來、不存「現在」；懶結算。

---

## 基礎文件套件

| 檔 | 職責 | 狀態 |
| --- | --- | --- |
| [../README.md](../README.md) | 專案入口：定位、核心精神、技術棧、MVP、開發順序 | 入口 |
| [system-definition.md](system-definition.md) | 系統定義 v1.0（產品法源） | **確定** |
| [gdd/core-loop-planning.md](gdd/core-loop-planning.md) | 核心玩法北星（空間效率×時間規劃＝利潤） | **LOCKED** |
| [system-definition-v1.md](system-definition-v1.md) | 舊檔名轉址 | 轉址 |
| [production-system.md](production-system.md) | 生產系統正式設計（規則濃縮契約） | **確定** |
| [mvp.md](mvp.md) | 工程 MVP 範圍、非目標、驗收 | **確定** |
| [adr/README.md](adr/README.md) | ADR 編號約定（0001 技術棧／0002 產品／0003 規則閘門） | 索引 |
| [adr/0001-tech-stack.md](adr/0001-tech-stack.md) | 技術棧定案與分期落地 | **確定**／**分期** |
| [adr/0002-product-constraints.md](adr/0002-product-constraints.md) | 單人、1000 人、免費+內購 | **確定** |
| [adr/0003-production-rules.md](adr/0003-production-rules.md) | 規則／驗證作為架構約束（不重複貼 GDD；編號 0002 已用於產品約束） | **確定** |
| [next.md](next.md) | 現況與接下來要做的事（唯一任務入口） | 任務 |

[system-definition-v1.md](system-definition-v1.md) 只轉址，非法源。[gdd/production-system.md](gdd/production-system.md) 是節次入口與核心規則速覽，**不是**第二套全文。GDD **正式全文**在 [gdd/production-system-v2.md](gdd/production-system-v2.md)（《帝國掘起》遊戲設計文件 v2.0，節 1–17，含 SQL／JSON）；分冊 0001–0007 與全文同義拆讀。

---

## 法源分層

| 層 | 法源 | 狀態 |
| --- | --- | --- |
| 產品邊界、優先級、離線 8 現實小時 | [系統定義 v1.0](system-definition.md)、[ADR 0002](adr/0002-product-constraints.md) | **確定** |
| 產品體驗北星（怎麼玩＝規劃） | [gdd/core-loop-planning.md](gdd/core-loop-planning.md) | **LOCKED** |
| 技術棧最終定案、NestJS 模組 | [ADR 0001](adr/0001-tech-stack.md) | **確定**／**分期** |
| 生產規則（GDD v2.0 正式全文） | [gdd/production-system-v2.md](gdd/production-system-v2.md) | **確定** |
| 生產規則（節次入口／核心規則速覽） | [gdd/production-system.md](gdd/production-system.md) | 入口，不是全文 |
| 生產規則（分冊） | [gdd/README.md](gdd/README.md)（0001–0007） | **確定** |
| 規則濃縮契約 | [production-system.md](production-system.md) | **確定**（不是第二套 GDD） |
| 規則作為架構約束 | [ADR 0003](adr/0003-production-rules.md) | **確定** |
| ADR 編號約定 | [adr/README.md](adr/README.md) | 索引 |
| 技術架構總覽 | [architecture/overview.md](architecture/overview.md) | **確定** |
| 時間與懶結算契約 | [architecture/time-and-settlement.md](architecture/time-and-settlement.md) | **確定** |
| 架構契約 | [architecture.md](architecture.md)、[architecture/0001-module-boundaries.md](architecture/0001-module-boundaries.md) | **確定** |
| API v1 端點表 | [api/v1.md](api/v1.md) | **確定** |
| 工程 MVP 驗收 | [mvp.md](mvp.md) | **確定** |
| 農業切片目錄 | [gdd/mvp-agriculture-catalog.md](gdd/mvp-agriculture-catalog.md) | **確定**（槽位／ID，非整數值） |
| 產業擴充目錄 | [gdd/industry-expansion-catalog.md](gdd/industry-expansion-catalog.md) | 可玩擴充；不取代農業切片，也未填滿 50–100 |
| 開發分期 | [roadmap.md](roadmap.md) | **分期** |
| 現況與下一步 | [next.md](next.md) | 任務入口；不是第二套規則 |
| 目標首發範圍 | [gdd/launch-scope.md](gdd/launch-scope.md) | **確定**（不是工程 MVP） |
| AI 訂單 | [gdd/ai-orders.md](gdd/ai-orders.md) | 不在 MVP；只定義 |

---

## 本次基礎套件互鏈

| 檔 | 連到 | 狀態 |
| --- | --- | --- |
| [../README.md](../README.md) | docs 索引、ADR 0001、GDD v2、系統定義、架構 | 雙向 |
| [adr/README.md](adr/README.md) | 0001／0002／0003 編號約定 | 雙向 |
| [adr/0001-tech-stack.md](adr/0001-tech-stack.md) | 系統定義、GDD v2、overview、time-and-settlement、launch-scope、docs 索引 | 雙向 |
| [gdd/production-system-v2.md](gdd/production-system-v2.md) | ADR 0001、系統定義、launch-scope、架構、docs 索引 | 雙向 |
| [gdd/README.md](gdd/README.md) | 節 1–17 對照、全文、分冊 | 雙向 |
| [architecture/overview.md](architecture/overview.md) | ADR 0001、GDD v2、time-and-settlement、模組邊界 | 雙向 |
| [architecture/time-and-settlement.md](architecture/time-and-settlement.md) | ADR 0001、GDD §2、系統定義 §5、overview | 雙向 |
| [api/v1.md](api/v1.md) | GDD §12、overview 路由歸屬 | 雙向 |
| [adr/0003-production-rules.md](adr/0003-production-rules.md) | GDD 規則／驗證約束（不重複貼全文） | 雙向 |
| [gdd/launch-scope.md](gdd/launch-scope.md) | GDD §13／0007、ADR 0001、懶結算契約；不另寫規則 | 雙向 |

---

## 閱讀順序

1. [system-definition.md](system-definition.md) — 系統定義 v1.0 正式法源。
2. [gdd/core-loop-planning.md](gdd/core-loop-planning.md) — 核心玩法北星：**空間效率 × 時間規劃 = 利潤**（體驗法源；內容深度仍聽生產鏈深度）。
3. [adr/README.md](adr/README.md) → [adr/0001-tech-stack.md](adr/0001-tech-stack.md) — 編號約定與技術棧定案（**分期落地**）。
4. [adr/0002-product-constraints.md](adr/0002-product-constraints.md) — 單人、1000 人、免費+內購。
5. [mvp.md](mvp.md) — 工程 MVP 農業切片與驗收。
6. [gdd/mvp-agriculture-catalog.md](gdd/mvp-agriculture-catalog.md) — MVP 物品／建築／規則 ID 與驗證對照。
7. [production-system.md](production-system.md) — 規則濃縮契約（T／P、公式、繼承、驗證）。
8. [gdd/production-system.md](gdd/production-system.md) — GDD 節次入口與核心規則速覽。
9. [gdd/production-system-v2.md](gdd/production-system-v2.md) — 《帝國掘起》遊戲設計文件 v2.0 **正式全文**（節 1–17）。
10. [gdd/0002-time-and-settlement.md](gdd/0002-time-and-settlement.md) — 1:60、懶結算、離線 **8 現實小時**。
11. [gdd/0003-tiers-and-types.md](gdd/0003-tiers-and-types.md) → [0007](gdd/0007-scope-expansion.md) · [launch-scope.md](gdd/launch-scope.md)
12. [architecture.md](architecture.md) · [overview](architecture/overview.md) · [time-and-settlement](architecture/time-and-settlement.md)
13. [api/v1.md](api/v1.md) — `/api/v1` 端點表。
14. [adr/0003-production-rules.md](adr/0003-production-rules.md) — 規則／驗證作為架構約束。
15. [roadmap.md](roadmap.md)
16. [next.md](next.md) — 現況與接下來要做的事。

[system-definition-v1.md](system-definition-v1.md) 只轉址，不要當正文讀。[gdd/production-system.md](gdd/production-system.md) 是節次入口與核心規則速覽，不要當第二套全文讀。

---

## 衝突時聽誰的

有衝突就保留「目標 vs MVP」，不刪任一側。

| 主題 | 法源 | 不得另寫 |
| --- | --- | --- |
| 產品名稱 | 帝國掘起 | 另立崗起、Ascent 或崛起為遊戲名 |
| 技術棧 | ADR 0001 定案表 | Fastify 當核心；從 0001 刪 Redis／Socket.IO；Phaser 進核心；Redis 當主庫 |
| Redis／WS | 目標保留；MVP 可關 | 「永不使用」或「MVP 必須上」 |
| 離線上限 | **8 現實小時** = `28800` 現實秒 = `1728000` 遊戲秒（[system-definition.md](system-definition.md) §5） | 舊稿 `86400` 當入帳上限；原文「28800 遊戲秒」 |
| 工程 MVP | [mvp.md](mvp.md) | 市場／登入／WS／AI 訂單拖進 MVP |
| 目標首發產業 | [system-definition.md §2](system-definition.md) + GDD §13／0007 | 把目標首發縮成工程 MVP；T2 同位素首發開啟 |
| 系統定義檔名 | 正文只在 [system-definition.md](system-definition.md) | 把 [system-definition-v1.md](system-definition-v1.md) 當第二份法源；把正式檔改成空轉址 |
| 生產系統 | [gdd/production-system-v2.md](gdd/production-system-v2.md) | 在節次入口再寫一份全文；濃縮與全文寫兩套規則 |
| GDD SQL vs Prisma | 規則語意聽 GDD；實作 Prisma → PostgreSQL、`lastSettledAt` + 懶結算 | 用 SQL 當遷移腳本；兩套入帳 cap |
| ADR 編號 | 0002＝產品約束；0003＝規則／驗證架構約束 | 另建 `0002-production-rules.md` 覆蓋 [0002-product-constraints.md](adr/0002-product-constraints.md) |
| 日長欄 | `game_config.game_day_game_sec=86400` 語意必須存在（可與 `server_state` 合成） | 「硬編碼所以不建欄」而與 GDD SQL 打架 |

---

## 目錄

```
docs/
  README.md                         ← 本檔（索引）
  system-definition.md              ← 系統定義 v1.0 正式法源
  gdd/core-loop-planning.md         ← 核心玩法北星（LOCKED）
  system-definition-v1.md           ← 轉址，非法源
  production-system.md              ← 規則濃縮契約
  mvp.md
  gdd/mvp-agriculture-catalog.md
  gdd/industry-expansion-catalog.md
  next.md                           ← 現況與下一步（唯一任務入口）
  roadmap.md
  game-design.md                    ← 設計入口
  architecture.md                   ← 架構契約正文
  adr/README.md                      ← ADR 編號約定
  adr/0001-tech-stack.md
  adr/0002-product-constraints.md
  adr/0003-production-rules.md
  gdd/README.md
  gdd/production-system-v2.md       ← GDD v2.0 正式全文
  gdd/production-system.md          ← 節次入口／核心規則速覽
  gdd/0001-overview.md … 0007-scope-expansion.md
  gdd/launch-scope.md
  gdd/ai-orders.md                  ← 不在 MVP
  architecture/overview.md
  architecture/time-and-settlement.md
  architecture/0001-module-boundaries.md
  api/v1.md
```

---

## 下一步

任務只看 [next.md](next.md)。內容切片做到視覺為止。登入（F1）已開工；其餘五項的順序與完成樣子只寫在該檔「未來開發任務」。
