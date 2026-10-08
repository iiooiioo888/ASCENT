import { seedPlacedBuildingDefIds, startingInventory } from "@ascent/shared";

type WorldWriter = {
  player: {
    create(args: {
      data: { id: string; createdAt: Date; lastSeenAt: Date };
    }): Promise<unknown>;
  };
  playerInventory: {
    create(args: {
      data: { playerId: string; itemId: string; quantity: number };
    }): Promise<unknown>;
  };
  playerBuilding: {
    create(args: {
      data: {
        id: string;
        playerId: string;
        buildingDefId: string;
        lastSettledAt: Date;
        lastSettledGame: number;
        lastUpdate: Date;
        lastUpdateGame: number;
        queue: never[];
        inputs: Record<string, never>;
        outputs: Record<string, never>;
        bufferedOutputs: Record<string, never>;
        status: string;
      };
    }): Promise<unknown>;
  };
};

/** 新帳號的世界：開局庫存與預放建築與種子檔相同。不建立市集全域狀態。 */
export async function provisionNewPlayer(db: WorldWriter, playerId: string, now: Date): Promise<void> {
  await db.player.create({
    data: { id: playerId, createdAt: now, lastSeenAt: now },
  });
  for (const [itemId, qty] of Object.entries(startingInventory)) {
    await db.playerInventory.create({
      data: { playerId, itemId, quantity: qty },
    });
  }
  for (const defId of seedPlacedBuildingDefIds) {
    await db.playerBuilding.create({
      data: {
        id: `pb_${playerId}_${defId}`,
        playerId,
        buildingDefId: defId,
        lastSettledAt: now,
        lastSettledGame: 0,
        lastUpdate: now,
        lastUpdateGame: 0,
        queue: [],
        inputs: {},
        outputs: {},
        bufferedOutputs: {},
        status: "idle",
      },
    });
  }
}
