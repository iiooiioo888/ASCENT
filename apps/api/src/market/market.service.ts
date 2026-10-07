import { BadRequestException, Injectable } from "@nestjs/common";
import {
  ITEM_GOLD_ID,
  LOCAL_PLAYER_ID,
  parseTradeQuantity,
  resolveMarketUnitPrice,
  resolveSellGoldAfterTransport,
} from "@ascent/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "../inventory/inventory.service";
import { creditPlayerItem, deductPlayerItem } from "../inventory/player-inventory-tx";

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
      const depth = this.sim.opsDepth;
      const settled = resolveSellGoldAfterTransport(itemId, unitPrice, qty, depth);
      if (!settled) throw new BadRequestException("運費過高");

      return this.prisma.$transaction(async (tx) => {
        await deductPlayerItem(tx, itemId, qty);
        await creditPlayerItem(tx, ITEM_GOLD_ID, settled.netGold);
        return {
          side: "sell" as const,
          itemId,
          quantity: qty,
          unitPrice,
          goldDelta: settled.netGold,
          netGoldDelta: settled.netGold,
          transportFee: settled.transportFee,
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
        await deductPlayerItem(tx, ITEM_GOLD_ID, goldCost, "金幣不足");
        await creditPlayerItem(tx, itemId, qty);
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

}
