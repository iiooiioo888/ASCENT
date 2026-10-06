# GDD 0006：引擎（節 11）

正式全文：[production-system-v2.md](production-system-v2.md) §11。濃縮契約：[../production-system.md](../production-system.md)。本分冊為欄位級正文。衝突時：技術棧聽 ADR 0001；入帳時間聽系統定義 §5 與 GDD 0002。GDD `core/` 是純計算，**不是** NestJS 模組名。禁止再建模組叫 `core`。之後開工時放進 `packages/shared`，由 NestJS 模組引用。完整邊界：[architecture/overview.md](../architecture/overview.md)。

GDD 原稿目錄：

```
core/          Config、GameClock、Settlement、FormulaEngine、
               RuleEngine、MethodGenerator、LoopGenerator、Validator
systems/       Inventory、Production、Building
```

GDD 原稿 `Config`：`timeScale=60`、`maxOfflineGameSec=86400`、`tickIntervalRealMs=5000`（86400＝日長，**不入帳**）。實作再加 `maxOfflineRealSec=28800` 與衍生 `1728000`。

| 物件 | 職責 | NestJS 模組 | 可碰 HTTP／DB／WS | MVP |
| --- | --- | --- | --- | --- |
| `Config` | `timeScale=60`、`gameDayGameSec=86400`、`maxOfflineRealSec=28800`、`maxOfflineGameSec=1728000`、`tickIntervalRealMs=5000`；不讀環境當第二套比例 | `simulation` | 否 | 要 |
| `GameClock` | 推算 `gameTime`；真實／遊戲換算 | `simulation` | 否 | 要 |
| `Settlement` | 懶結算純函數 | `simulation` | 否 | 要 |
| `FormulaEngine` | 白名單求值 | `rules` | 否 | 要 |
| `RuleEngine` | 繼承、組合、覆寫 | `rules` | 否 | 要 |
| `MethodGenerator` | 規則 → 方式 | `rules` | 否 | 要 |
| `LoopGenerator` | 標產業迴圈 | `rules` | 否 | 可簡化 |
| `Validator` | 驗證清單 | `rules` | 否（可被管理端呼叫） | 要 |
| `systems.Inventory` | 庫存讀寫；唯一入帳入口 | `inventory` | 可 | 要 |
| `systems.Production` | 開工／停止／收取前先結算 | `inventory` | 可 | 要 |
| `systems.Building` | 放置與建築狀態 | `inventory` | 可 | 要 |
| 推送 | 只推已提交結果 | `realtime` | 只 WS | **關** |
| BullMQ tick | 呼叫同一結算入口 | `jobs` | 經同一入口 | **關** |

`simulation` 不開 Controller、不寫庫、不讀 `Date.now()`。`realtime` 只推已提交結果。`jobs` 與 `inventory` 同一結算入口。

```
settle(entity, nowReal, clock, rules, catalog) → SettlementResult
```

前端可用 `packages/shared` 同一純函數預覽；預覽不得寫回。

`Config` 必須同時能表達：GDD 原稿三常數（`timeScale=60`、原稿 `maxOfflineGameSec=86400` 作為 `gameDayGameSec`、`tickIntervalRealMs=5000`）與產品入帳 cap（`maxOfflineRealSec=28800`，衍生 1,728,000）。不得把 86400 從文件刪掉，也不得用 86400 裁切產能。

GDD 原稿 `Config`（必須保留，86400 **不入帳**）：

```json
{
  "timeScale": 60,
  "maxOfflineGameSec": 86400,
  "tickIntervalRealMs": 5000
}
```

實作 `Config`（入帳 cap 聽系統定義；日長承接原稿 86400）：

```json
{
  "timeScale": 60,
  "gameDayGameSec": 86400,
  "maxOfflineRealSec": 28800,
  "maxOfflineGameSec": 1728000,
  "tickIntervalRealMs": 5000
}
```

---

## 相關文件

| 文件 | 職責 |
| --- | --- |
| [GDD v2.0 §11](production-system-v2.md#11-核心引擎模組) | 引擎全文 |
| [ADR 0001](../adr/0001-tech-stack.md) | NestJS 模組邊界 |
| [architecture/overview.md](../architecture/overview.md) | 純計算 ↔ 模組對照 |
