import {
  SEED_WHEAT_ITEM_ID,
  STORAGE_FULL_MESSAGE,
  WHEAT_ITEM_ID,
  countStorageStacks,
  lineageAfterCredit,
  lineageAfterDeplete,
  playerProgressFromDb,
  wouldExceedStorageCap,
  type PlayerProgress,
  type SeedLineageMap,
} from "@ascent/shared";
import { BadRequestException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client";
import { currentPlayerId } from "../auth/player-context";
import type { SettlementTransactionClient } from "./settlement-db-lock";

const LINEAGE_ITEMS = new Set([SEED_WHEAT_ITEM_ID, WHEAT_ITEM_ID]);

export async function loadPlayerProgress(
  tx: SettlementTransactionClient,
  playerId = currentPlayerId(),
): Promise<PlayerProgress> {
  const player = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
  return playerProgressFromDb(player.progress);
}

export async function savePlayerProgress(
  tx: SettlementTransactionClient,
  progress: PlayerProgress,
  extra?: Prisma.PlayerUpdateInput,
  playerId = currentPlayerId(),
): Promise<void> {
  await tx.player.update({
    where: { id: playerId },
    data: {
      progress: progress as unknown as Prisma.InputJsonValue,
      ...extra,
    },
  });
}

export async function inventoryStorageRows(
  tx: SettlementTransactionClient,
  playerId = currentPlayerId(),
): Promise<{ itemId: string; quantity: number }[]> {
  const rows = await tx.playerInventory.findMany({ where: { playerId } });
  return rows.map((row) => ({ itemId: row.itemId, quantity: Number(row.quantity) }));
}

export async function assertStorageAllowsGain(
  tx: SettlementTransactionClient,
  gain: Record<string, number>,
): Promise<void> {
  const rows = await inventoryStorageRows(tx);
  if (wouldExceedStorageCap(rows, gain)) {
    throw new BadRequestException(STORAGE_FULL_MESSAGE);
  }
}

export async function mixLineageOnCredit(
  progress: PlayerProgress,
  tx: SettlementTransactionClient,
  gain: Record<string, number>,
  produceGeneration: Record<string, number>,
): Promise<PlayerProgress> {
  let lineage: SeedLineageMap = { ...progress.seedLineage };
  for (const [itemId, qty] of Object.entries(gain)) {
    if (!LINEAGE_ITEMS.has(itemId) || qty <= 0) continue;
    const row = await tx.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: currentPlayerId(), itemId } },
    });
    const have = row ? Number(row.quantity) : 0;
    lineage = lineageAfterCredit(lineage, itemId, have, qty, produceGeneration[itemId] ?? 0);
  }
  return { ...progress, seedLineage: lineage };
}

export async function mixLineageOnDeplete(
  progress: PlayerProgress,
  tx: SettlementTransactionClient,
  consumed: Record<string, number>,
): Promise<PlayerProgress> {
  let lineage: SeedLineageMap = { ...progress.seedLineage };
  for (const [itemId, qty] of Object.entries(consumed)) {
    if (!LINEAGE_ITEMS.has(itemId) || qty <= 0) continue;
    const row = await tx.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: currentPlayerId(), itemId } },
    });
    const remain = row ? Number(row.quantity) : 0;
    lineage = lineageAfterDeplete(lineage, itemId, remain);
  }
  return { ...progress, seedLineage: lineage };
}

export { countStorageStacks };
