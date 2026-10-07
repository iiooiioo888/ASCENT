import { BadRequestException, Injectable } from "@nestjs/common";
import { LOCAL_PLAYER_ID, resolveShelfAskGold } from "@ascent/shared";
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

  async patchShelf(body: { enabled?: boolean; ask?: number }) {
    if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
      throw new BadRequestException("enabled 須為布林");
    }
    if (body.ask !== undefined) {
      if (typeof body.ask !== "number" || !Number.isInteger(body.ask) || body.ask < 1) {
        throw new BadRequestException("ask 須為 ≥1 的整數");
      }
    }
    if (body.enabled === undefined && body.ask === undefined) {
      throw new BadRequestException("請提供 enabled 或 ask");
    }

    const nextEnabled = body.enabled;
    const nextAsk = body.ask;

    return this.inventory.runExclusive(async () => {
      await this.inventory.settleAllUnlocked();
      const now = new Date();
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.playerRetailState.findUnique({ where: { playerId: LOCAL_PLAYER_ID } });
        const createData = {
          playerId: LOCAL_PLAYER_ID,
          shelfEnabled: nextEnabled === true,
          shelfAskGold: nextAsk ?? null,
          shelfLastTickAt: now,
        };
        if (!existing) {
          await tx.playerRetailState.create({ data: createData });
          return;
        }
        const data: {
          shelfEnabled?: boolean;
          shelfAskGold?: number | null;
          shelfLastTickAt?: Date;
        } = {};
        if (nextEnabled !== undefined) data.shelfEnabled = nextEnabled;
        if (nextAsk !== undefined) data.shelfAskGold = nextAsk;
        if (nextEnabled === true && !existing.shelfLastTickAt) {
          data.shelfLastTickAt = now;
        }
        await tx.playerRetailState.update({
          where: { playerId: LOCAL_PLAYER_ID },
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
    return resolveShelfAskGold(null, this.sim.marketPriceBook, this.sim.retailConfig);
  }
}
