import { BadRequestException, Injectable } from "@nestjs/common";
import { resolveShelfAskGold } from "@ascent/shared";
import { currentPlayerId } from "../auth/player-context";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "../inventory/inventory.service";
import {
  loadRetailShelfPublicState,
  settleRetailShelfUnlocked,
} from "./retail-shelf.settlement";

@Injectable()
export class RetailShelfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
    private readonly inventory: InventoryService,
  ) {}

  async getShelf() {
    return this.inventory.runExclusive(async () => {
      await this.inventory.settleAllUnlocked();
      const nowMs = Date.now();
      return this.prisma.$transaction((tx) => loadRetailShelfPublicState(tx, this.sim, nowMs));
    });
  }

  async patchShelf(body: { enabled?: boolean; ask?: number; followMarket?: boolean }) {
    if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
      throw new BadRequestException("enabled 須為布林");
    }
    if (body.ask !== undefined) {
      if (typeof body.ask !== "number" || !Number.isInteger(body.ask) || body.ask < 1) {
        throw new BadRequestException("ask 須為 ≥1 的整數");
      }
    }
    if (body.followMarket !== undefined && typeof body.followMarket !== "boolean") {
      throw new BadRequestException("followMarket 須為布林");
    }
    if (body.enabled === undefined && body.ask === undefined && body.followMarket === undefined) {
      throw new BadRequestException("請提供 enabled、ask 或 followMarket");
    }

    const nextEnabled = body.enabled;
    const nextAsk = body.ask;
    const nextFollowMarket = body.followMarket;

    return this.inventory.runExclusive(async () => {
      await this.inventory.settleAllUnlocked();
      const now = new Date();
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.playerRetailState.findUnique({ where: { playerId: currentPlayerId() } });
        const createData = {
          playerId: currentPlayerId(),
          shelfEnabled: nextEnabled === true,
          shelfFollowMarket: nextFollowMarket ?? (nextAsk === undefined ? true : false),
          shelfAskGold: nextAsk ?? null,
          shelfLastTickAt: now,
        };
        if (!existing) {
          await tx.playerRetailState.create({ data: createData });
          return;
        }
        const data: {
          shelfEnabled?: boolean;
          shelfFollowMarket?: boolean;
          shelfAskGold?: number | null;
          shelfLastTickAt?: Date;
        } = {};
        if (nextEnabled !== undefined) data.shelfEnabled = nextEnabled;
        if (nextAsk !== undefined) {
          data.shelfAskGold = nextAsk;
          data.shelfFollowMarket = false;
        }
        if (nextFollowMarket !== undefined) data.shelfFollowMarket = nextFollowMarket;
        if (nextEnabled === true && !existing.shelfLastTickAt) {
          data.shelfLastTickAt = now;
        }
        await tx.playerRetailState.update({
          where: { playerId: currentPlayerId() },
          data,
        });
      });
      const nowMs = Date.now();
      return this.prisma.$transaction((tx) => loadRetailShelfPublicState(tx, this.sim, nowMs));
    });
  }

  /** 供整合測試注入固定亂數。 */
  async runShelfSettlementForTest(now: Date, rnd: () => number) {
    return this.inventory.runExclusive(() =>
      this.prisma.$transaction((tx) => settleRetailShelfUnlocked(tx, this.sim, now, rnd)),
    );
  }

  resolveDefaultAsk(): number {
    return resolveShelfAskGold(null, true, this.sim.marketPriceBook, this.sim.retailConfig);
  }
}
