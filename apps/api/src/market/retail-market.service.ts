import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  ITEM_SETTLEMENT_CURRENCY_ID,
  LOCAL_PLAYER_ID,
  RETAIL_OPS_HINT,
  RETAIL_SKU_ID,
  isRetailOfferExpired,
  pickBuyerLabel,
  resolveRetailBidAnchor,
  retailConfigFromDb,
  retailOfferToDto,
  rollBidGold,
  rollOfferQty,
  rollOfferTtlMs,
  type RetailConfig,
  type RetailOffer,
} from "@ascent/shared";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "../inventory/inventory.service";
import { creditPlayerItem, deductPlayerItem } from "../inventory/player-inventory-tx";

type StoredRetailOffer = RetailOffer & { slot: number };

function parseStoredOffers(raw: unknown): StoredRetailOffer[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredRetailOffer[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const offerId = typeof o.offerId === "string" ? o.offerId : "";
    const skuId = o.skuId === RETAIL_SKU_ID ? RETAIL_SKU_ID : null;
    const qty = typeof o.qty === "number" && Number.isInteger(o.qty) && o.qty > 0 ? o.qty : null;
    const bidGold =
      typeof o.bidGold === "number" && Number.isInteger(o.bidGold) && o.bidGold > 0 ? o.bidGold : null;
    const slot = typeof o.slot === "number" && Number.isInteger(o.slot) && o.slot >= 0 ? o.slot : null;
    if (!offerId || !skuId || qty === null || bidGold === null || slot === null) continue;
    const offer: StoredRetailOffer = {
      offerId,
      skuId,
      qty,
      bidGold,
      slot,
    };
    if (typeof o.expiresAt === "number" && Number.isFinite(o.expiresAt)) {
      offer.expiresAt = o.expiresAt;
    }
    if (typeof o.buyerLabel === "string" && o.buyerLabel.length > 0) {
      offer.buyerLabel = o.buyerLabel;
    }
    out.push(offer);
  }
  return out;
}

@Injectable()
export class RetailMarketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
    private readonly inventory: InventoryService,
  ) {}

  async getRetail() {
    return this.inventory.runExclusive(async () => {
      await this.inventory.settleAllUnlocked();
      const config = this.retailConfig();
      const nowMs = Date.now();
      const offers = await this.syncOffers(config, nowMs);
      const bread = await this.getBreadQty();
      return {
        offers: offers.map((o) => retailOfferToDto(o)),
        breadQty: bread,
        opsHint: RETAIL_OPS_HINT,
        slotCount: config.slotCount,
      };
    });
  }

  async acceptOffer(offerId: unknown) {
    if (typeof offerId !== "string" || offerId.length === 0) {
      throw new BadRequestException("客單已失效");
    }

    return this.inventory.runExclusive(async () => {
      await this.inventory.settleAllUnlocked();
      const config = this.retailConfig();
      const nowMs = Date.now();
      const offers = await this.syncOffers(config, nowMs);
      const match = offers.find((o) => o.offerId === offerId);
      if (!match || isRetailOfferExpired(match.expiresAt, nowMs)) {
        throw new BadRequestException("客單已失效");
      }

      const goldCredit = match.bidGold * match.qty;
      const busyBefore = await this.getWorkforceBusy();

      const result = await this.prisma.$transaction(async (tx) => {
        const row = await tx.playerRetailState.findUnique({ where: { playerId: LOCAL_PLAYER_ID } });
        const current = parseStoredOffers(row?.offers);
        const live = current.find((o) => o.offerId === offerId);
        if (!live || isRetailOfferExpired(live.expiresAt, nowMs)) {
          throw new BadRequestException("客單已失效");
        }

        await deductPlayerItem(tx, RETAIL_SKU_ID, live.qty);
        await creditPlayerItem(tx, ITEM_SETTLEMENT_CURRENCY_ID, goldCredit);

        const anchor = resolveRetailBidAnchor(this.sim.marketPriceBook, config);
        const replacement = this.spawnOffer(live.slot, config, anchor, nowMs);
        const nextOffers = current
          .filter((o) => o.offerId !== offerId)
          .concat(replacement)
          .sort((a, b) => a.slot - b.slot);

        await tx.playerRetailState.upsert({
          where: { playerId: LOCAL_PLAYER_ID },
          create: { playerId: LOCAL_PLAYER_ID, offers: nextOffers as unknown as Prisma.InputJsonValue },
          update: { offers: nextOffers as unknown as Prisma.InputJsonValue },
        });

        return {
          offerId: live.offerId,
          skuId: live.skuId,
          quantity: live.qty,
          bidGold: live.bidGold,
          goldDelta: goldCredit,
          feeGold: 0,
          haulGold: 0,
          replacementOffer: retailOfferToDto(replacement),
        };
      });

      const busyAfter = await this.getWorkforceBusy();
      if (busyBefore !== busyAfter) {
        throw new Error("零售接單不應變更 workforce.busy");
      }

      return result;
    });
  }

  private retailConfig(): RetailConfig {
    return this.sim.retailConfig;
  }

  private async getBreadQty(): Promise<number> {
    const row = await this.prisma.playerInventory.findUnique({
      where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: RETAIL_SKU_ID } },
    });
    return row ? Number(row.quantity) : 0;
  }

  private async getWorkforceBusy(): Promise<number> {
    const player = await this.prisma.player.findUnique({ where: { id: LOCAL_PLAYER_ID } });
    return player?.workforceBusy ?? 0;
  }

  private async syncOffers(config: RetailConfig, nowMs: number): Promise<StoredRetailOffer[]> {
    const anchor = resolveRetailBidAnchor(this.sim.marketPriceBook, config);
    const row = await this.prisma.playerRetailState.findUnique({ where: { playerId: LOCAL_PLAYER_ID } });
    let bySlot = new Map<number, StoredRetailOffer>();
    for (const o of parseStoredOffers(row?.offers)) {
      if (o.slot >= config.slotCount) continue;
      const existing = bySlot.get(o.slot);
      if (!existing || o.offerId) bySlot.set(o.slot, o);
    }

    const next: StoredRetailOffer[] = [];
    let changed = !row;
    for (let slot = 0; slot < config.slotCount; slot++) {
      const current = bySlot.get(slot);
      if (current && !isRetailOfferExpired(current.expiresAt, nowMs)) {
        next.push(current);
        continue;
      }
      if (current) changed = true;
      next.push(this.spawnOffer(slot, config, anchor, nowMs));
      changed = true;
    }

    if (changed) {
      await this.prisma.playerRetailState.upsert({
        where: { playerId: LOCAL_PLAYER_ID },
        create: { playerId: LOCAL_PLAYER_ID, offers: next as unknown as Prisma.InputJsonValue },
        update: { offers: next as unknown as Prisma.InputJsonValue },
      });
    }

    return next;
  }

  private spawnOffer(slot: number, config: RetailConfig, anchorGold: number, nowMs: number): StoredRetailOffer {
    const rnd = Math.random;
    const expiresAt = nowMs + rollOfferTtlMs(config, rnd);
    return {
      offerId: randomUUID(),
      skuId: RETAIL_SKU_ID,
      slot,
      qty: rollOfferQty(config, rnd),
      bidGold: rollBidGold(anchorGold, config.bidVarianceRatio, rnd),
      expiresAt,
      buyerLabel: pickBuyerLabel(rnd),
    };
  }
}
