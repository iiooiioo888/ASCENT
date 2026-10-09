/** 訂單板：三階確定性 NPC 單。生成雜湊在 API（Node crypto）。禁止 Math.random()。 */

export const NPC_ORDER_SOURCE = "npc_merchant";
export const NPC_ORDER_CONSUME_ITEM_ID = "item_bread";
export const NPC_ORDER_GAME_HOUR_SEC = 3600;

/** 相容舊測：急單 rule id。 */
export const NPC_ORDER_RULE_ID = "npc_merchant_bread";

export const NPC_ORDER_MAX_ACTIVE = 3;
export const NPC_ORDER_MAX_ACTIVE_PER_RULE = 1;

/** 新手檔頻率表仍保留；訂單板空位以「補滿」為主，不靠擲骰才出現目標。 */
export const NPC_ORDER_RATE_PER_GAME_HOUR = 0.05;
export const NPC_ORDER_DURATION_GAME_SEC = 21_600;
export const NPC_ORDER_CONSUME_RATIO_MIN = 0.3;
export const NPC_ORDER_CONSUME_RATIO_MAX = 0.6;
export const NPC_ORDER_GOLD_REWARD_MULT = 1.5;

export type NpcOrderStatus = "pending" | "completed" | "rejected" | "expired";

export type NpcOrderTierDef = {
  ruleId: string;
  tier: 1 | 2 | 3;
  code: "easy" | "mid" | "hard";
  label: string;
  consumeItemId: string;
  quantity: number;
  durationGameSec: number;
  goldMult: number;
};

/**
 * 2–3 個難度階層撐起 T2 前。
 * 急單 6 現實分／商約 1 遊戲日／大單 3 遊戲日（259200 遊戲秒＝72 現實分）。
 */
export const NPC_ORDER_TIERS: readonly NpcOrderTierDef[] = [
  {
    ruleId: NPC_ORDER_RULE_ID,
    tier: 1,
    code: "easy",
    label: "急單",
    consumeItemId: NPC_ORDER_CONSUME_ITEM_ID,
    quantity: 2,
    durationGameSec: 21_600,
    goldMult: 1.5,
  },
  {
    ruleId: "npc_merchant_bread_mid",
    tier: 2,
    code: "mid",
    label: "商約",
    consumeItemId: NPC_ORDER_CONSUME_ITEM_ID,
    quantity: 8,
    durationGameSec: 86_400,
    goldMult: 1.8,
  },
  {
    ruleId: "npc_merchant_bread_hard",
    tier: 3,
    code: "hard",
    label: "大單",
    consumeItemId: NPC_ORDER_CONSUME_ITEM_ID,
    quantity: 20,
    durationGameSec: 259_200,
    goldMult: 2.2,
  },
];

export const NPC_ORDER_RULE_IDS = NPC_ORDER_TIERS.map((row) => row.ruleId);

export type NpcOrderRequiredItem = {
  item_id: string;
  quantity: number;
};

export type NpcOrderReward = {
  kind: "gold";
  item_id: string;
  quantity: number;
};

export function npcOrderTierByRuleId(ruleId: string): NpcOrderTierDef | undefined {
  return NPC_ORDER_TIERS.find((row) => row.ruleId === ruleId);
}

export function npcOrderSpawnBucket(gameSec: number): number {
  return Math.floor(Math.max(0, gameSec) / NPC_ORDER_GAME_HOUR_SEC);
}

export function npcOrderCreatedGameSec(spawnBucket: number): number {
  return spawnBucket * NPC_ORDER_GAME_HOUR_SEC;
}

export function npcOrderExpiresGameSec(spawnBucket: number, durationGameSec = NPC_ORDER_DURATION_GAME_SEC): number {
  return npcOrderCreatedGameSec(spawnBucket) + durationGameSec;
}

export function npcOrderRequiredQuantity(holdings: number, ratio: number): number {
  if (!Number.isFinite(holdings) || holdings <= 0) return 0;
  const qty = Math.floor(holdings * ratio);
  return qty > 0 ? qty : 0;
}

export function npcOrderGoldReward(
  breadQty: number,
  breadUnitPrice: number,
  goldMult = NPC_ORDER_GOLD_REWARD_MULT,
): number {
  if (breadQty <= 0 || breadUnitPrice <= 0) return 0;
  return Math.max(1, Math.floor(breadQty * breadUnitPrice * goldMult));
}
