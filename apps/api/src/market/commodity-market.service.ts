import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import {
  COMMODITIES_CONFIG,
  ITEM_SETTLEMENT_CURRENCY_ID,
  SETTLEMENT_INSUFFICIENT_MESSAGE,
  LOCAL_PLAYER_ID,
  appendPriceHistory,
  computeCommodityFee,
  computeCommodityUnitPrice,
  isCommoditySellBlockedByFee,
  enabledCommodityListings,
  findCommodityListing,
  initialPriceHistory,
  parsePriceHistory,
  parseTradeQuantity,
  type CommodityListingConfig,
  type PriceHistoryPoint,
} from "@ascent/shared";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { SETTLEMENT_CONFLICT_MESSAGE } from "../inventory/building-state-update";

const EPS = 1e-9;

type CommodityRowDto = {
  commodityId: string;
  name: string;
  itemId: string;
  basePrice: number;
  enabled: boolean;
  price: number;
  change: number;
  holdings: number;
  priceHistory: PriceHistoryPoint[];
};

@Injectable()
export class CommodityMarketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  async getCommodities() {
    await this.inventory.runExclusive(() => this.inventory.settleAllUnlocked());
    const gold = await this.getGoldBalance();
    const listings = await Promise.all(
      enabledCommodityListings().map((cfg) => this.buildListingDto(cfg)),
    );
    return {
      feeRate: COMMODITIES_CONFIG.feeRate,
      minFeeGold: COMMODITIES_CONFIG.minFeeGold,
      maxQtyPerOrder: COMMODITIES_CONFIG.maxQtyPerOrder,
      priceHistorySize: COMMODITIES_CONFIG.priceHistorySize,
      liquidity: COMMODITIES_CONFIG.liquidity,
      gold,
      settlementCurrencyItemId: ITEM_SETTLEMENT_CURRENCY_ID,
      listings,
    };
  }

  async buyCommodity(commodityId: string, quantity: unknown) {
    const qty = parseTradeQuantity(quantity);
    if (qty === null) throw new BadRequestException("數量無效");
    return this.trade("buy", commodityId, qty);
  }

  async sellCommodity(commodityId: string, quantity: unknown) {
    const qty = parseTradeQuantity(quantity);
    if (qty === null) throw new BadRequestException("數量無效");
    return this.trade("sell", commodityId, qty);
  }

  private async trade(side: "buy" | "sell", commodityId: string, qty: number) {
    const listing = findCommodityListing(commodityId);
    if (!listing || !listing.enabled) {
      throw new BadRequestException(`不可交易：${commodityId}`);
    }
    if (qty > COMMODITIES_CONFIG.maxQtyPerOrder) {
      throw new BadRequestException("超過單筆上限");
    }

    return this.inventory.runExclusive(async () => {
      await this.inventory.settleAllUnlocked();

      return this.prisma.$transaction(async (tx) => {
        const state = await this.ensureState(tx, listing);
        const netVolume = Number(state.netPressureVolume);
        const unitPrice = computeCommodityUnitPrice(listing.basePrice, netVolume);
        const notional = unitPrice * qty;
        const fee = computeCommodityFee(notional);

        if (side === "sell" && isCommoditySellBlockedByFee(notional)) {
          throw new BadRequestException("手續費過高");
        }

        const volumeDelta = side === "buy" ? qty : -qty;
        const newNetVolume = netVolume + volumeDelta;
        const newPrice = computeCommodityUnitPrice(listing.basePrice, newNetVolume);
        const history = appendPriceHistory(parsePriceHistory(state.priceHistory), newPrice);

        if (side === "buy") {
          const goldCost = notional + fee;
          await this.deductItem(tx, ITEM_SETTLEMENT_CURRENCY_ID, goldCost, SETTLEMENT_INSUFFICIENT_MESSAGE);
          await this.creditItem(tx, listing.itemId, qty);
        } else {
          await this.deductItem(tx, listing.itemId, qty);
          const goldGain = notional - fee;
          await this.creditItem(tx, ITEM_SETTLEMENT_CURRENCY_ID, goldGain);
        }

        await tx.commodityMarketState.update({
          where: { commodityId: listing.id },
          data: {
            netPressureVolume: newNetVolume,
            priceHistory: history,
          },
        });

        const listingDto = await this.buildListingDto(listing, {
          netPressureVolume: newNetVolume,
          priceHistory: history,
        });

        return {
          side,
          commodityId: listing.id,
          quantity: qty,
          unitPrice,
          notional,
          fee,
          goldDelta: side === "buy" ? -(notional + fee) : notional - fee,
          listing: listingDto,
        };
      });
    });
  }

  private async buildListingDto(
    listing: CommodityListingConfig,
    stateOverride?: { netPressureVolume: number; priceHistory: PriceHistoryPoint[] },
  ): Promise<CommodityRowDto> {
    const state = stateOverride ?? (await this.loadState(listing.id));
    const price = computeCommodityUnitPrice(listing.basePrice, state.netPressureVolume);
    const holdings = await this.getItemBalance(listing.itemId);
    return {
      commodityId: listing.id,
      name: listing.name,
      itemId: listing.itemId,
      basePrice: listing.basePrice,
      enabled: listing.enabled,
      price,
      change: price - listing.basePrice,
      holdings,
      priceHistory: state.priceHistory,
    };
  }

  private async loadState(commodityId: string) {
    const row = await this.prisma.commodityMarketState.findUnique({ where: { commodityId } });
    if (!row) {
      const listing = findCommodityListing(commodityId);
      if (!listing) throw new BadRequestException(`不可交易：${commodityId}`);
      const history = initialPriceHistory(listing.basePrice);
      return { netPressureVolume: 0, priceHistory: history };
    }
    return {
      netPressureVolume: Number(row.netPressureVolume),
      priceHistory: parsePriceHistory(row.priceHistory),
    };
  }

  private async ensureState(tx: Prisma.TransactionClient, listing: CommodityListingConfig) {
    const existing = await tx.commodityMarketState.findUnique({ where: { commodityId: listing.id } });
    if (existing) return existing;
    const history = initialPriceHistory(listing.basePrice);
    return tx.commodityMarketState.create({
      data: {
        commodityId: listing.id,
        netPressureVolume: 0,
        priceHistory: history,
      },
    });
  }

  private async getGoldBalance(tx?: Prisma.TransactionClient) {
    return this.getItemBalance(ITEM_SETTLEMENT_CURRENCY_ID, tx);
  }

  private async getItemBalance(itemId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    const row = await client.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
    });
    return row ? Number(row.quantity) : 0;
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
      if (itemId === ITEM_SETTLEMENT_CURRENCY_ID) {
        throw new BadRequestException(insufficientMessage ?? SETTLEMENT_INSUFFICIENT_MESSAGE);
      }
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
