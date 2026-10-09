import { BadRequestException, Injectable } from "@nestjs/common";
import {
  ITEM_GOLD_ID,
  ITEM_SETTLEMENT_CURRENCY_ID,
  MARKET_SEED_GENERATION,
  SEED_WHEAT_ITEM_ID,
  SETTLEMENT_INSUFFICIENT_MESSAGE,
  parseTradeQuantity,
  resolveMarketUnitPrice,
  resolveSellGoldAfterTransport,
} from "@ascent/shared";
import { currentPlayerId } from "../auth/player-context";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "../inventory/inventory.service";
import { creditPlayerItem, deductPlayerItem } from "../inventory/player-inventory-tx";
import {
  assertStorageAllowsGain,
  loadPlayerProgress,
  mixLineageOnCredit,
  savePlayerProgress,
} from "../inventory/player-progress-tx";

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
      where: { playerId: currentPlayerId() },
    });
    const qtyByItem = new Map(rows.map((r) => [r.itemId, Number(r.quantity)]));
    const tradableIds = [
      ...new Set([...Object.keys(book.sell), ...Object.keys(book.buy), ITEM_SETTLEMENT_CURRENCY_ID]),
    ];
    const holdings: Record<string, number> = {};
    for (const id of tradableIds) {
      holdings[id] = qtyByItem.get(id) ?? 0;
    }
    const settlementBalance = holdings[ITEM_SETTLEMENT_CURRENCY_ID] ?? 0;
    return {
      /** @deprecated 欄位名保留；CURR-BARTER 起數值＝銅錠結算餘額。 */
      gold: settlementBalance,
      settlementCurrencyItemId: ITEM_SETTLEMENT_CURRENCY_ID,
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
        await creditPlayerItem(tx, ITEM_SETTLEMENT_CURRENCY_ID, settled.netGold);
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
        await assertStorageAllowsGain(tx, { [itemId]: qty });
        if (itemId === SEED_WHEAT_ITEM_ID) {
          const progress = await loadPlayerProgress(tx);
          const mixed = await mixLineageOnCredit(
            progress,
            tx,
            { [itemId]: qty },
            { [itemId]: MARKET_SEED_GENERATION },
          );
          await savePlayerProgress(tx, mixed);
        }
        await deductPlayerItem(tx, ITEM_SETTLEMENT_CURRENCY_ID, goldCost, SETTLEMENT_INSUFFICIENT_MESSAGE);
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
