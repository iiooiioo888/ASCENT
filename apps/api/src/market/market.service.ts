import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  ITEM_GOLD_ID,
  LOCAL_PLAYER_ID,
  parseTradeQuantity,
  resolveMarketUnitPrice,
} from "@ascent/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "../inventory/inventory.service";
import { SETTLEMENT_CONFLICT_MESSAGE } from "../inventory/building-state-update";

const EPS = 1e-9;

@Injectable()
export class MarketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
    private readonly inventory: InventoryService,
  ) {}

  async getMarket() {
    await this.inventory.runExclusive(() => this.inventory.settleAllUnlocked());
    const book = this.sim.marketPriceBook;
    const rows = await this.prisma.playerInventory.findMany({
      where: { playerId: LOCAL_PLAYER_ID },
    });
    const qtyByItem = new Map(rows.map((r) => [r.itemId, Number(r.quantity)]));
    const tradableIds = [...Object.keys(book.sell), ...Object.keys(book.buy), ITEM_GOLD_ID];
    const holdings: Record<string, number> = {};
    for (const id of tradableIds) {
      holdings[id] = qtyByItem.get(id) ?? 0;
    }
    return {
      gold: holdings[ITEM_GOLD_ID] ?? 0,
      prices: book,
      holdings,
    };
  }

  async sell(itemId: string, quantity: unknown) {
    const qty = parseTradeQuantity(quantity);
    if (qty === null) throw new BadRequestException("數量無效");
    if (itemId === ITEM_GOLD_ID) throw new BadRequestException(`不可交易：${ITEM_GOLD_ID}`);

    return this.inventory.runExclusive(async () => {
      await this.inventory.settleAllUnlocked();
      const book = this.sim.marketPriceBook;
      const unitPrice = resolveMarketUnitPrice("sell", itemId, book);
      if (unitPrice === null) throw new BadRequestException(`不可交易：${itemId}`);
      const goldGain = unitPrice * qty;

      return this.prisma.$transaction(async (tx) => {
        await this.deductItem(tx, itemId, qty);
        await this.creditItem(tx, ITEM_GOLD_ID, goldGain);
        return {
          side: "sell" as const,
          itemId,
          quantity: qty,
          unitPrice,
          goldDelta: goldGain,
        };
      });
    });
  }

  async buy(itemId: string, quantity: unknown) {
    const qty = parseTradeQuantity(quantity);
    if (qty === null) throw new BadRequestException("數量無效");
    if (itemId === ITEM_GOLD_ID) throw new BadRequestException(`不可交易：${ITEM_GOLD_ID}`);

    return this.inventory.runExclusive(async () => {
      await this.inventory.settleAllUnlocked();
      const book = this.sim.marketPriceBook;
      const unitPrice = resolveMarketUnitPrice("buy", itemId, book);
      if (unitPrice === null) throw new BadRequestException(`不可交易：${itemId}`);
      const goldCost = unitPrice * qty;

      return this.prisma.$transaction(async (tx) => {
        await this.deductItem(tx, ITEM_GOLD_ID, goldCost, "金幣不足");
        await this.creditItem(tx, itemId, qty);
        return {
          side: "buy" as const,
          itemId,
          quantity: qty,
          unitPrice,
          goldDelta: -goldCost,
        };
      });
    });
  }

  private async deductItem(
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
      if (itemId === ITEM_GOLD_ID) throw new BadRequestException(insufficientMessage ?? "金幣不足");
      throw new BadRequestException(insufficientMessage ?? `資源不足：${itemId}`);
    }
    throw new ConflictException(SETTLEMENT_CONFLICT_MESSAGE);
  }

  private async creditItem(tx: Prisma.TransactionClient, itemId: string, qty: number) {
    await tx.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
      update: { quantity: { increment: qty } },
      create: { playerId: LOCAL_PLAYER_ID, itemId, quantity: qty },
    });
  }
}
