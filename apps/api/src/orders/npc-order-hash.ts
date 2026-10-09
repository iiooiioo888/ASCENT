import { createHash } from "node:crypto";
import { NPC_ORDER_CONSUME_RATIO_MAX, NPC_ORDER_CONSUME_RATIO_MIN } from "@ascent/shared";

/** gdd/ai-orders.md §7：SHA-256 前／次 8 bytes 轉 [0, 1)，禁止 Math.random()。 */
export function unitIntervalFromDigest(digest: Buffer, byteOffset: number): number {
  const slice = digest.subarray(byteOffset, byteOffset + 8);
  const n = slice.readBigUInt64BE(0);
  return Number(n) / Number(2n ** 64n);
}

export function npcOrderDigest(playerId: string, spawnBucket: number, ruleId: string): Buffer {
  const plain = `${playerId}\n${spawnBucket}\n${ruleId}`;
  return createHash("sha256").update(plain, "utf8").digest();
}

export function npcOrderSpawnRoll(playerId: string, spawnBucket: number, ruleId: string): number {
  return unitIntervalFromDigest(npcOrderDigest(playerId, spawnBucket, ruleId), 0);
}

export function npcOrderConsumeRatio(playerId: string, spawnBucket: number, ruleId: string, itemId: string): number {
  const plain = `${playerId}\n${spawnBucket}\n${ruleId}\n${itemId}`;
  const digest = createHash("sha256").update(plain, "utf8").digest();
  const u = unitIntervalFromDigest(digest, 0);
  const span = NPC_ORDER_CONSUME_RATIO_MAX - NPC_ORDER_CONSUME_RATIO_MIN;
  return NPC_ORDER_CONSUME_RATIO_MIN + span * u;
}
