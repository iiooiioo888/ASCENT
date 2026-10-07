import { gameConfigFromRow } from "../src/simulation/game-config.loader";

describe("gameConfigFromRow / gameConfigFromDb", () => {
  it("完整非 null 列映射所有欄位", () => {
    expect(
      gameConfigFromRow({
        id: 1,
        timeScale: 42,
        gameDayGameSec: 12345,
        maxOfflineRealSec: 9999,
        maxOfflineGameSec: 8888,
        tickIntervalRealMs: 777,
      }),
    ).toEqual({
      timeScale: 42,
      gameDayGameSec: 12345,
      maxOfflineRealSec: 9999,
      maxOfflineGameSec: 8888,
      tickIntervalRealMs: 777,
    });
  });
});
