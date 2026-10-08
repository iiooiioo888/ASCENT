# ADR 索引

| 項 | 值 |
| --- | --- |
| 狀態 | **確定**（編號約定；不改定案） |
| 技術棧法源 | [0001-tech-stack.md](0001-tech-stack.md) |
| 產品邊界 | [0002-product-constraints.md](0002-product-constraints.md) |
| 規則／驗證閘門 | [0003-production-rules.md](0003-production-rules.md) |

本目錄只放架構決策紀錄。不寫遊戲程式、不安裝依賴、不建 monorepo。

---

## 編號約定（禁止覆蓋）

| 編號 | 檔名 | 職責 | 不得另寫 |
| --- | --- | --- | --- |
| 0001 | [0001-tech-stack.md](0001-tech-stack.md) | TypeScript 全棧、React+Vite、NestJS、PostgreSQL+JSONB+GIN、Prisma、Redis+BullMQ、Socket.IO、1:60 懶結算、模組邊界、否決項 | 改定案表；從目標棧刪 Redis／Socket.IO；Phaser 進核心 |
| 0002 | [0002-product-constraints.md](0002-product-constraints.md) | 單人、≤1000 人、免費+內購、網頁+手機、無限發展 | 另建 `0002-production-rules.md` **覆蓋**本檔 |
| 0003 | [0003-production-rules.md](0003-production-rules.md) | 把 GDD 規則／驗證清單定為架構閘門（不重複貼全文） | 在本檔再貼一份 GDD SQL／JSON |

使用者若要求「生產規則 ADR」，讀 **0003**，不要新建 `0002-production-rules.md`。

---

## 與其他法源

| 主題 | 聽誰 |
| --- | --- |
| 技術棧、NestJS 模組、否決 Fastify／Phaser 進核心／Redis 當主庫／每 tick 全量模擬 | ADR 0001 |
| 產品名稱、優先級、MVP vs 目標首發 | ADR 0002 + [系統定義](../system-definition.md)（帝國掘起） |
| T／P、公式、繼承、驗證碼、方式由規則生成 | ADR 0003 閘門；細則 [GDD v2.0](../gdd/production-system-v2.md) |
| 入帳離線上限 8 現實小時 | 系統定義 §5；ADR 0001 **不另定**第二套數字 |

完整閱讀順序：[docs/README.md](../README.md)。
