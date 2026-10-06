# GDD 0002：時間系統與懶結算（節 2）

正式全文：[production-system-v2.md](production-system-v2.md) §2。濃縮契約：[../production-system.md](../production-system.md) §2。本分冊為欄位級正文。技術契約：[ADR 0001](../adr/0001-tech-stack.md)、[architecture/time-and-settlement.md](../architecture/time-and-settlement.md)。產品入帳上限：[系統定義 v1.0 §5](../system-definition.md)。

時間是**算出來的**，不是存下來的。不對每座建築每遊戲秒跑迴圈。懶結算。無加速。`timeScale` 寫死為 60，不是 61。「真實時間」與「現實時間」同義（wall clock）。

## 兩層數字（禁止混成兩套入帳）

GDD 原稿三常數**必須出現在本檔**（86400 **不得**拿來裁切產能）：

```json
{
  "timeScale": 60,
  "maxOfflineGameSec": 86400,
  "tickIntervalRealMs": 5000
}
```

入帳 cap **只准**系統定義的 8 現實小時。86400 不得用來裁切產能。

| 層 | 鍵 | 值 | 用途 |
| --- | --- | --- | --- |
| GDD v2.0 原稿 | `timeScale` | `60` | 比例；寫死 |
| GDD v2.0 原稿 | `maxOfflineGameSec` | `86400` | **日長**＝1 遊戲日＝24 真實分鐘。原稿曾用此值當離線上限 |
| GDD v2.0 原稿 | `tickIntervalRealMs` | `5000` | 粗粒度 tick（真實毫秒），不是遊戲秒迴圈 |
| 實作日長 | `gameDayGameSec` | `86400` | 承接 GDD 原稿同值；日曆／顯示；**不是**入帳 cap |
| 產品入帳（權威） | `maxOfflineRealSec` | `28800` | **8 現實小時**。產能真實差先 cap 此值 |
| 產品入帳（衍生） | `Config.maxOfflineGameSec` | `1728000` | `28800 × 60`＝20 遊戲日。**不是**把 GDD 原稿改寫成此數 |

開工 `game_config` **只准一列入帳 cap**：`max_offline_real_sec=28800`、`max_offline_game_sec=1728000`。ADR 0001 不另定第二套上限。

禁止：用 86400／1440 裁切產能；把 GDD 原稿 86400 改寫成 1728000 冒充原稿；`1 真實秒 = 61 遊戲秒`；每遊戲秒迴圈。

## 2.1 比例（寫死）

- **1 真實秒 = 60 遊戲秒 = 1 遊戲分鐘**
- 真實 1 分鐘 = 遊戲 1 小時
- 真實 1 小時 = 遊戲 60 小時
- **遊戲 1 天 = 24 真實分鐘 = 86400 遊戲秒**（日長，不是入帳上限）
- 真實 1 日 = 遊戲 60 日

| 真實 | 遊戲 |
| --- | --- |
| 1 秒 | 60 秒 = 1 分鐘 |
| 1 分鐘 | 1 小時 |
| 1 小時 | 60 小時 |
| 24 分鐘 | 1 遊戲日 = **86400 遊戲秒** |
| 1 日 | 60 日 |
| 8 小時 | 480 遊戲小時 = **1,728,000 遊戲秒**＝入帳上限 |

## 2.2 顯示公式與儲存規則

世界時鐘只存錨點，不存「現在」。

| 欄位 | 時間種類 | 存？ | 用途 |
| --- | --- | --- | --- |
| `start_real_time` / `startRealTime` | 真實（Unix 毫秒或 TIMESTAMPTZ） | 是 | 世界起點 |
| `start_game_time` / `startGameTime` | 遊戲秒 | 是 | 起點對應的遊戲秒 |
| `finish_at` / `finishAt` | 真實 | 是（可空） | 世界結束；空 = 仍在進行 |
| `last_update` | 真實 | 是 | 世界列最後寫入 |
| `time_scale` | — | 是 | 必須 = 60 |
| `max_offline_real_sec` | 真實秒 | 是 | 必須 = 28800（入帳） |
| `max_offline_game_sec` | 遊戲秒 | 是 | 必須 = 1728000（入帳衍生） |
| `tick_interval_real_ms` | 真實毫秒 | 是 | 必須 = 5000 |
| `game_day_game_sec` | 遊戲秒 | 是 | 必須 = 86400（日長；承接原稿 `maxOfflineGameSec`） |
| **當前遊戲時間** | 遊戲秒 | **否** | 讀取時推算 |

`now` 與 `startRealTime` 為 Unix 毫秒：

```
gameTime = startGameTime + (now - startRealTime) / 1000 × timeScale
```

客戶端可用此式本地推算。`GET /api/v1/time` 只回傳顯示用欄位。**判定與入帳以伺服器結算為準。**

## 2.3 實體雙時鐘

GDD 的 `last_settled_game` / `last_update_game` 是**遊戲秒快照**。ADR 的 `lastSettledAt` 是**真實游標**。實體必須**同時保存**兩套，禁止只用其中一套入帳。

| 欄位 | JSON | 時間種類 | 角色 |
| --- | --- | --- | --- |
| `last_settled_at` | `lastSettledAt` | **真實** | **權威游標**。該時刻以前的產出已入帳 |
| `last_settled_game` | `lastSettledGame` | **遊戲秒** | 快照，供顯示與除錯，**不得單獨入帳** |
| `last_update` | `lastUpdate` | **真實** | 本列最後一次寫入 |
| `last_update_game` | `lastUpdateGame` | **遊戲秒** | 上述寫入當下的顯示用遊戲秒 |
| `finish_at` | `finishAt` | **真實** | 本段生產預計結束（可空） |

結算用真實差 × 60 得到遊戲時間差，不用遊戲欄位相減當產能：

```
rawRealDeltaSec     = max(0, nowReal - lastSettledAt)
cappedRealDeltaSec  = min(rawRealDeltaSec, maxOfflineRealSec)   // 28800
gameDeltaSec        = cappedRealDeltaSec × timeScale            // × 60
```

GDD 原稿若用 `86400 / 60 = 1440` 真實秒當 cap，**僅作歷史紀錄**。實作 `offlineCapRealSec` **必須**是 `28800`。

若 `last_settled_game` 與由 `lastSettledAt` 推回的值不一致，**以真實 `lastSettledAt` 重算**，再寫回兩個欄位。

## 2.4 懶結算契約

不對每座建築每遊戲秒跑迴圈。只在下列時機，把一個實體從 `lastSettledAt` 補算到本次 `nowReal`：

| 時機 | 目標棧 | MVP |
| --- | --- | --- |
| 讀取或操作該實體（GET／開工／停止／收取） | 要 | **要**（請求路徑必做） |
| 粗粒度 tick（`tickIntervalRealMs=5000`） | BullMQ `jobs` | 可選 NestJS 定時器；可不啟 |
| 上線／離線補算 | 要 | 無登入時以**進頁 GET** 代替 |

純函數（`simulation.Settlement`）：

- 輸入：`lastSettledAt`、本次 `nowReal`、輸入／輸出／庫存快照、配方與規則、`Config`。
- 輸出：這段（裁切後）遊戲時間的結算結果。
- 同輸入同結果。內部不讀 `Date.now()`、不寫庫、不發網。
- `nowReal` 由呼叫端（`inventory` / `jobs`）注入。

步驟（冪等）：

1. 算 `rawRealDeltaSec`、`cappedRealDeltaSec`、`gameDeltaSec`（上式；cap = 28800）。
2. 用 `gameDeltaSec` 算產出／消耗（工時單位是遊戲秒）。
3. `inventory` 入帳（同一入口）。失敗則不推進游標。
4. 寫入成功後**兩個時鐘一起推進到本次 now**：
   - `lastSettledAt = nowReal`（不是 `lastSettledAt + capped`）
   - `last_settled_game = gameTime(nowReal)`（顯示時鐘，**不裁切**）
   - `last_update` / `last_update_game` 同步
5. 上限以外的真實區間視為已結算且**產能為 0**，不得在後續請求再補產。禁止只把游標推進 28800 秒留下餘額。

顯示用 `gameTime` 不因離線上限凍結。產能才裁切。

伺服器是唯一權威。前端可用 `packages/shared` 同一純函數預覽，預覽不得寫回庫存。

## 2.5 `GET /api/v1/time`

| 項 | 契約 |
| --- | --- |
| 路由模組 | `inventory`（可碰 HTTP） |
| 計算 | 呼叫 `simulation.GameClock`；**禁止**在 `simulation` 開 Controller |
| 回傳 | `startRealTime`、`startGameTime`、`serverRealTime`、`displayGameTime`、`timeScale=60` |
| 不做 | 不結算建築、不改庫存、不推進 `lastSettledAt` |
| 判定 | 僅顯示。入帳仍走建築／庫存 GET 或寫入 API 的懶結算 |

## 2.6 已作廢／禁止（明示）

| 來源 | 處理 |
| --- | --- |
| 用 `maxOfflineGameSec=86400` **入帳**（24 真實分鐘） | **禁止**。86400 只當日長與 GDD 原稿紀錄 |
| 原稿「28800 遊戲秒 = 遊戲內 8 小時」 | **廢棄**（與 1:60 矛盾：8 現實小時 × 60 = 480 遊戲小時） |
| 「產品 8 現實小時與 GDD 衝突時以 86400 入帳」 | **禁止** |
| 把 GDD 原稿 86400 改寫成 1728000 冒充原稿 | **禁止** |
| Schema 預設 86400、另加可空 28800 當第二套 cap | **禁止**（兩套入帳） |
| `1 真實秒 = 61 遊戲秒` | **禁止** |
| 每座建築每遊戲秒迴圈 | **禁止** |
| 只存遊戲欄、不存 `lastSettledAt` | **禁止** |
| 「硬編碼日長所以不建 `game_day_game_sec`」 | **禁止**。語意欄必須存在（可與 `server_state` 合成） |

---

## 相關文件

| 文件 | 職責 |
| --- | --- |
| [GDD v2.0 §2](production-system-v2.md#2-時間系統) | 時間規則全文 |
| [ADR 0001](../adr/0001-tech-stack.md) | 1:60 與懶結算技術契約 |
| [系統定義 §5](../system-definition.md) | 入帳 8 現實小時 |
| [架構結算契約](../architecture/time-and-settlement.md) | 懶結算步驟、冪等、mermaid |
| [API v1](../api/v1.md) | `GET /api/v1/time` |
