import { AsyncLocalStorage } from "node:async_hooks";
import { LOCAL_PLAYER_ID } from "@ascent/shared";

const storage = new AsyncLocalStorage<string>();

/** 請求或背景結算當下的玩家。沒有上下文時維持單機種子玩家，讓既有測試與種子路徑不變。 */
export function currentPlayerId(): string {
  return storage.getStore() ?? LOCAL_PLAYER_ID;
}

export function runWithPlayer<T>(playerId: string, fn: () => T): T {
  return storage.run(playerId, fn);
}
