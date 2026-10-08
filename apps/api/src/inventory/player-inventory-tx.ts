import {
  ITEM_GOLD_ID,
  ITEM_SETTLEMENT_CURRENCY_ID,
  LOCAL_PLAYER_ID,
  SETTLEMENT_INSUFFICIENT_MESSAGE,
} from "@ascent/shared";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { SETTLEMENT_CONFLICT_MESSAGE } from "./building-state-update";

const EPS = 1e-9;

export async function deductPlayerItem(
  tx: Prisma.TransactionClient,
  itemId: string,
  qty: number,
  insufficientMessage?: string,
) {
  const updated = await tx.playerInventory.updateMany({
    where: {
      playerId: LOCAL_PLAYER_ID,
      itemId,
      quantity: { gte: qty },
    },
    data: { quantity: { decrement: qty } },
  });
  if (updated.count === 1) return;

  const row = await tx.playerInventory.findUnique({
    where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
  });
  const have = row ? Number(row.quantity) : 0;
  if (have + EPS < qty) {
    if (itemId === ITEM_SETTLEMENT_CURRENCY_ID || itemId === ITEM_GOLD_ID) {
      throw new BadRequestException(insufficientMessage ?? SETTLEMENT_INSUFFICIENT_MESSAGE);
    }
    throw new BadRequestException(insufficientMessage ?? `資源不足：${itemId}`);
  }
  throw new ConflictException(SETTLEMENT_CONFLICT_MESSAGE);
}

export async function creditPlayerItem(tx: Prisma.TransactionClient, itemId: string, qty: number) {
  await tx.playerInventory.upsert({
    where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
    update: { quantity: { increment: qty } },
    create: { playerId: LOCAL_PLAYER_ID, itemId, quantity: qty },
  });
}
