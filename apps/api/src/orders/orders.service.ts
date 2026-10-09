import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ITEM_SETTLEMENT_CURRENCY_ID,
  NPC_ORDER_CONSUME_ITEM_ID,
  NPC_ORDER_MAX_ACTIVE,
  NPC_ORDER_RATE_PER_GAME_HOUR,
  NPC_ORDER_RULE_ID,
  npcOrderCreatedGameSec,
  npcOrderExpiresGameSec,
  npcOrderGoldReward,
  npcOrderRequiredQuantity,
  npcOrderSpawnBucket,
  type NpcOrderRequiredItem,
  type NpcOrderReward,
} from "@ascent/shared";
import { randomBytes } from "node:crypto";
import { currentPlayerId } from "../auth/player-context";
import { creditPlayerItem, deductPlayerItem } from "../inventory/player-inventory-tx";
import {
  type SettlementTransactionClient,
  withSettlementTransaction,
} from "../inventory/settlement-db-lock";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { npcOrderConsumeRatio, npcOrderSpawnRoll } from "./npc-order-hash";

export type NpcOrderPublic = {
  id: string;
  ruleId: string;
  status: string;
  requiredItems: NpcOrderRequiredItem[];
  rewards: NpcOrderReward[];
  createdGameSec: number;
  expiresGameSec: number;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
  ) {}

  async listPending(): Promise<NpcOrderPublic[]> {
    const rows = await this.prisma.playerNpcOrder.findMany({
      where: { playerId: currentPlayerId(), status: "pending" },
      orderBy: { createdGameSec: "asc" },
    });
    return rows.map(toPublic);
  }

  async settleUnlocked(tx: SettlementTransactionClient, gameSec: number): Promise<void> {
    const playerId = currentPlayerId();
    const currentBucket = npcOrderSpawnBucket(gameSec);

    await tx.playerNpcOrder.updateMany({
      where: {
        playerId,
        status: "pending",
        expiresGameSec: { lte: BigInt(Math.floor(gameSec)) },
      },
      data: { status: "expired" },
    });

    const scan = await tx.playerNpcOrderScan.findUnique({
      where: { playerId_ruleId: { playerId, ruleId: NPC_ORDER_RULE_ID } },
    });
    if (!scan) {
      await this.maybeSpawnBucket(tx, playerId, currentBucket);
      await tx.playerNpcOrderScan.create({
        data: {
          playerId,
          ruleId: NPC_ORDER_RULE_ID,
          lastScannedBucket: BigInt(currentBucket),
        },
      });
      return;
    }

    const last = Number(scan.lastScannedBucket);
    for (let bucket = last + 1; bucket <= currentBucket; bucket++) {
      await this.maybeSpawnBucket(tx, playerId, bucket);
    }
    if (currentBucket > last) {
      await tx.playerNpcOrderScan.update({
        where: { playerId_ruleId: { playerId, ruleId: NPC_ORDER_RULE_ID } },
        data: { lastScannedBucket: BigInt(currentBucket) },
      });
    }
  }

  async accept(orderId: string) {
    return withSettlementTransaction(this.prisma, async (tx) => {
      const playerId = currentPlayerId();
      const order = await tx.playerNpcOrder.findUnique({ where: { id: orderId } });
      if (!order || order.playerId !== playerId) throw new NotFoundException("訂單不存在");
      if (order.status !== "pending") {
        return toPublic(order);
      }
      const clock = await tx.serverState.findUniqueOrThrow({ where: { id: 1 } });
      const game = this.sim.displayGameTime(
        { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
        Date.now(),
      );
      if (Number(order.expiresGameSec) <= game) {
        await tx.playerNpcOrder.update({
          where: { id: orderId },
          data: { status: "expired" },
        });
        throw new BadRequestException("訂單已過期");
      }
      const required = order.requiredItems as NpcOrderRequiredItem[];
      const rewards = order.rewardsSnapshot as NpcOrderReward[];
      for (const item of required) {
        await deductPlayerItem(tx, item.item_id, item.quantity, "訂單材料不足");
      }
      for (const reward of rewards) {
        await creditPlayerItem(tx, reward.item_id, reward.quantity);
      }
      const completed = await tx.playerNpcOrder.update({
        where: { id: orderId, status: "pending" },
        data: { status: "completed" },
      });
      return toPublic(completed);
    });
  }

  private async maybeSpawnBucket(
    tx: SettlementTransactionClient,
    playerId: string,
    spawnBucket: number,
  ): Promise<void> {
    const existing = await tx.playerNpcOrder.findUnique({
      where: {
        playerId_spawnBucket_ruleId: {
          playerId,
          spawnBucket: BigInt(spawnBucket),
          ruleId: NPC_ORDER_RULE_ID,
        },
      },
    });
    if (existing) return;

    const pendingCount = await tx.playerNpcOrder.count({
      where: { playerId, ruleId: NPC_ORDER_RULE_ID, status: "pending" },
    });
    if (pendingCount >= NPC_ORDER_MAX_ACTIVE) return;

    const roll = npcOrderSpawnRoll(playerId, spawnBucket, NPC_ORDER_RULE_ID);
    if (roll >= NPC_ORDER_RATE_PER_GAME_HOUR) return;

    const breadRow = await tx.playerInventory.findUnique({
      where: { playerId_itemId: { playerId, itemId: NPC_ORDER_CONSUME_ITEM_ID } },
    });
    const holdings = breadRow ? Number(breadRow.quantity) : 0;
    const ratio = npcOrderConsumeRatio(playerId, spawnBucket, NPC_ORDER_RULE_ID, NPC_ORDER_CONSUME_ITEM_ID);
    const quantity = npcOrderRequiredQuantity(holdings, ratio);
    if (quantity <= 0) return;

    const unitPrice = this.sim.marketPriceBook.sell[NPC_ORDER_CONSUME_ITEM_ID] ?? 8;
    const gold = npcOrderGoldReward(quantity, unitPrice);
    if (gold <= 0) return;

    await tx.playerNpcOrder.create({
      data: {
        id: `npcord_${randomBytes(8).toString("hex")}`,
        playerId,
        ruleId: NPC_ORDER_RULE_ID,
        spawnBucket: BigInt(spawnBucket),
        status: "pending",
        requiredItems: [{ item_id: NPC_ORDER_CONSUME_ITEM_ID, quantity }],
        rewardsSnapshot: [
          {
            kind: "gold",
            item_id: ITEM_SETTLEMENT_CURRENCY_ID,
            quantity: gold,
          },
        ],
        createdGameSec: BigInt(npcOrderCreatedGameSec(spawnBucket)),
        expiresGameSec: BigInt(npcOrderExpiresGameSec(spawnBucket)),
      },
    });
  }
}

function toPublic(order: {
  id: string;
  ruleId: string;
  status: string;
  requiredItems: unknown;
  rewardsSnapshot: unknown;
  createdGameSec: bigint;
  expiresGameSec: bigint;
}): NpcOrderPublic {
  return {
    id: order.id,
    ruleId: order.ruleId,
    status: order.status,
    requiredItems: order.requiredItems as NpcOrderRequiredItem[],
    rewards: order.rewardsSnapshot as NpcOrderReward[],
    createdGameSec: Number(order.createdGameSec),
    expiresGameSec: Number(order.expiresGameSec),
  };
}
