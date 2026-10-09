/** 最小 NPC 訂單切片：規則資料在 shared；生成雜湊在 API（Node crypto）。 */

export const NPC_ORDER_RULE_ID = "npc_merchant_bread";
export const NPC_ORDER_SOURCE = "npc_merchant";
export const NPC_ORDER_CONSUME_ITEM_ID = "item_bread";
export const NPC_ORDER_GAME_HOUR_SEC = 3600;

/** 新手檔：每遊戲小時機率 0.05（對齊 gdd/ai-orders.md 頻率表）。 */
export const NPC_ORDER_RATE_PER_GAME_HOUR = 0.05;
export const NPC_ORDER_MAX_ACTIVE = 1;
export const NPC_ORDER_DURATION_GAME_SEC = 21_600;
export const NPC_ORDER_CONSUME_RATIO_MIN = 0.3;
export const NPC_ORDER_CONSUME_RATIO_MAX = 0.6;
/** 金幣獎勵相對消耗市價的倍率（gdd 金幣 1.5×）。 */
export const NPC_ORDER_GOLD_REWARD_MULT = 1.5;

export type NpcOrderStatus = "pending" | "completed" | "rejected" | "expired";

export type NpcOrderRequiredItem = {
  item_id: string;
  quantity: number;
};

export type NpcOrderReward = {
  kind: "gold";
  item_id: string;
  quantity: number;
};

export function npcOrderSpawnBucket(gameSec: number): number {
  return Math.floor(Math.max(0, gameSec) / NPC_ORDER_GAME_HOUR_SEC);
}

export function npcOrderCreatedGameSec(spawnBucket: number): number {
  return spawnBucket * NPC_ORDER_GAME_HOUR_SEC;
}

export function npcOrderExpiresGameSec(spawnBucket: number): number {
  return npcOrderCreatedGameSec(spawnBucket) + NPC_ORDER_DURATION_GAME_SEC;
}

export function npcOrderRequiredQuantity(holdings: number, ratio: number): number {
  if (!Number.isFinite(holdings) || holdings <= 0) return 0;
  const qty = Math.floor(holdings * ratio);
  return qty > 0 ? qty : 0;
}

export function npcOrderGoldReward(breadQty: number, breadUnitPrice: number): number {
  if (breadQty <= 0 || breadUnitPrice <= 0) return 0;
  return Math.max(1, Math.floor(breadQty * breadUnitPrice * NPC_ORDER_GOLD_REWARD_MULT));
}
