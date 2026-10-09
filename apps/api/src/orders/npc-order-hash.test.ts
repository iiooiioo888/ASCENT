import { describe, expect, it } from "vitest";
import { npcOrderSpawnRoll, unitIntervalFromDigest } from "./npc-order-hash";
import { createHash } from "node:crypto";

describe("NPC 訂單確定性擲骰", () => {
  it("同輸入同結果，且落在 [0, 1)", () => {
    const a = npcOrderSpawnRoll("player_local", 12, "npc_merchant_bread");
    const b = npcOrderSpawnRoll("player_local", 12, "npc_merchant_bread");
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    const other = npcOrderSpawnRoll("player_other", 12, "npc_merchant_bread");
    expect(other).not.toBe(a);
  });

  it("digest 切法對齊 SHA-256 大端 8 bytes", () => {
    const digest = createHash("sha256").update("p\n1\nr", "utf8").digest();
    expect(unitIntervalFromDigest(digest, 0)).toBe(Number(digest.readBigUInt64BE(0)) / Number(2n ** 64n));
  });
});
