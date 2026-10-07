import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  EQUITY_CONFIG,
  ITEM_GOLD_ID,
  LOCAL_PLAYER_ID,
  PriceHistoryPoint,
  appendPriceHistoryRing,
  clampEquityPrice,
  computeEquityFee,
  getEquityListing,
  isKnownEquityId,
  parseTradeQuantity,
} from "@ascent/shared";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { SETTLEMENT_CONFLICT_MESSAGE } from "../inventory/building-state-update";

const EPS = 1e-9;

function parseHistory(raw: unknown): PriceHistoryPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: PriceHistoryPoint[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const t = (row as { t?: unknown }).t;
    const price = (row as { price?: unknown }).price;
    if (typeof t === "number" && Number.isFinite(t) && typeof price === "number" && Number.isFinite(price)) {
      out.push({ t, price });
    }
  }
  return out;
}

function roundPrice(n: number): number {
  return Math.round(n);
}

@Injectable()
export class EquityMarketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  async getEquityMarket() {
    await this.inventory.runExclusive(() => this.inventory.settleAllUnlocked());
    const tickers = await this.loadTickers();
    const holdings = await this.loadHoldings();
    const goldRow = await this.prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
    });
    return {
      gold: goldRow ? Number(goldRow.quantity) : 0,
      feeRate: EQUITY_CONFIG.feeRate,
      minFeeGold: EQUITY_CONFIG.minFeeGold,
      maxSharesPerEquity: EQUITY_CONFIG.maxSharesPerEquity,
      maxQtyPerOrder: EQUITY_CONFIG.maxQtyPerOrder,
      holdings,
      tickers,
    };
  }

  async buy(equityId: string, quantity: unknown) {
    const qty = parseTradeQuantity(quantity);
    if (qty === null) throw new BadRequestException("數量無效");
    if (!isKnownEquityId(equityId)) throw new BadRequestException(`不可交易：${equityId}`);
    if (qty > EQUITY_CONFIG.maxQtyPerOrder) throw new BadRequestException("超過單筆上限");

    return this.inventory.runExclusive(() => this.executeTrade("buy", equityId, qty));
  }

  async sell(equityId: string, quantity: unknown) {
    const qty = parseTradeQuantity(quantity);
    if (qty === null) throw new BadRequestException("數量無效");
    if (!isKnownEquityId(equityId)) throw new BadRequestException(`不可交易：${equityId}`);
    if (qty > EQUITY_CONFIG.maxQtyPerOrder) throw new BadRequestException("超過單筆上限");

    return this.inventory.runExclusive(() => this.executeTrade("sell", equityId, qty));
  }

  private async executeTrade(side: "buy" | "sell", equityId: string, qty: number) {
    await this.inventory.settleAllUnlocked();
    const listing = getEquityListing(equityId)!;

    return this.prisma.$transaction(async (tx) => {
      const ticker = await tx.equityTickerState.findUnique({ where: { equityId } });
      if (!ticker) throw new BadRequestException(`不可交易：${equityId}`);

      const holding = await tx.playerEquityHolding.findUnique({
        where: { playerId_equityId: { playerId: LOCAL_PLAYER_ID, equityId } },
      });
      const currentShares = holding?.shares ?? 0;
      const unitPrice = ticker.currentPrice;
      const notional = unitPrice * qty;
      const fee = computeEquityFee(notional);

      if (side === "buy") {
        if (currentShares + qty > EQUITY_CONFIG.maxSharesPerEquity) {
          throw new BadRequestException("已達持倉上限");
        }
        const goldCost = notional + fee;
        await this.deductGold(tx, goldCost);
        await this.upsertShares(tx, equityId, currentShares + qty);
      } else {
        if (currentShares < qty) throw new BadRequestException("持倉不足");
        if (notional <= fee) throw new BadRequestException("手續費過高");
        const goldGain = notional - fee;
        await this.upsertShares(tx, equityId, currentShares - qty);
        await this.creditGold(tx, goldGain);
      }

      const netDelta = side === "buy" ? qty : -qty;
      const newNetBuy = ticker.netBuyVolume + netDelta;
      const newPrice = roundPrice(clampEquityPrice(listing.basePrice, newNetBuy));
      const history = parseHistory(ticker.priceHistory);
      const newHistory = appendPriceHistoryRing(history, { t: Date.now(), price: newPrice });

      await tx.equityTickerState.update({
        where: { equityId },
        data: {
          netBuyVolume: newNetBuy,
          currentPrice: newPrice,
          priceHistory: newHistory as unknown as Prisma.InputJsonValue,
        },
      });

      const updatedHolding = await tx.playerEquityHolding.findUnique({
        where: { playerId_equityId: { playerId: LOCAL_PLAYER_ID, equityId } },
      });

      return {
        side,
        equityId,
        quantity: qty,
        unitPrice,
        notional,
        fee,
        goldDelta: side === "buy" ? -(notional + fee) : notional - fee,
        newPrice,
        priceHistory: newHistory,
        holdings: { [equityId]: updatedHolding?.shares ?? 0 },
      };
    });
  }

  private async loadTickers() {
    const rows = await this.prisma.equityTickerState.findMany();
    const byId = new Map(rows.map((r) => [r.equityId, r]));
    return EQUITY_CONFIG.listings.map((listing) => {
      const row = byId.get(listing.id);
      const basePrice = listing.basePrice;
      const currentPrice = row?.currentPrice ?? basePrice;
      const priceHistory = row ? parseHistory(row.priceHistory) : [];
      const netBuy = row?.netBuyVolume ?? 0;
      const change = currentPrice - basePrice;
      return {
        id: listing.id,
        name: listing.name,
        basePrice,
        currentPrice,
        change,
        netBuyVolume: netBuy,
        priceHistory,
      };
    });
  }

  private async loadHoldings(): Promise<Record<string, number>> {
    const rows = await this.prisma.playerEquityHolding.findMany({
      where: { playerId: LOCAL_PLAYER_ID },
    });
    const holdings: Record<string, number> = {};
    for (const l of EQUITY_CONFIG.listings) holdings[l.id] = 0;
    for (const r of rows) holdings[r.equityId] = r.shares;
    return holdings;
  }

  private async upsertShares(tx: Prisma.TransactionClient, equityId: string, shares: number) {
    await tx.playerEquityHolding.upsert({
      where: { playerId_equityId: { playerId: LOCAL_PLAYER_ID, equityId } },
      update: { shares },
      create: { playerId: LOCAL_PLAYER_ID, equityId, shares },
    });
  }

  private async deductGold(tx: Prisma.TransactionClient, qty: number) {
    const updated = await tx.playerInventory.updateMany({
      where: {
        playerId: LOCAL_PLAYER_ID,
        itemId: ITEM_GOLD_ID,
        quantity: { gte: qty },
      },
      data: { quantity: { decrement: qty } },
    });
    if (updated.count === 1) return;

    const row = await tx.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
    });
    const have = row ? Number(row.quantity) : 0;
    if (have + EPS < qty) throw new BadRequestException("金幣不足");
    throw new ConflictException(SETTLEMENT_CONFLICT_MESSAGE);
  }

  private async creditGold(tx: Prisma.TransactionClient, qty: number) {
    await tx.playerInventory.upsert({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
      update: { quantity: { increment: qty } },
      create: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID, quantity: qty },
    });
  }
}
