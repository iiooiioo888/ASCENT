import type { PrismaClient } from "../generated/prisma/client";

/** CURR-BARTER：與 SQL migration 同邏輯，供整合測與 SQLite db push 環境驗證。 */
export async function migrateItemGoldToCopperIngot(prisma: PrismaClient): Promise<void> {
  const goldRows = await prisma.playerInventory.findMany({
    where: { itemId: "item_gold", quantity: { gt: 0 } },
  });
  for (const row of goldRows) {
    const qty = Number(row.quantity);
    if (qty <= 0) continue;
    await prisma.playerInventory.upsert({
      where: { playerId_itemId: { playerId: row.playerId, itemId: "item_copper_ingot" } },
      update: { quantity: { increment: qty } },
      create: { playerId: row.playerId, itemId: "item_copper_ingot", quantity: qty },
    });
    await prisma.playerInventory.update({
      where: { playerId_itemId: { playerId: row.playerId, itemId: "item_gold" } },
      data: { quantity: 0 },
    });
  }
}
