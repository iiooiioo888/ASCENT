import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  displayGameTime,
  marketPricesFromDb,
  opsDepthFromDb,
  settleProduction,
  settleWindow,
  type BuildingQueueJob,
  type BuildingStatus,
  type GameConfigValues,
  type MarketPriceBook,
  type OpsDepthConfig,
  type WorldClock,
} from "@ascent/shared";
import { PrismaService } from "../prisma/prisma.service";
import { gameConfigFromRow } from "./game-config.loader";

@Injectable()
export class SimulationService implements OnModuleInit {
  private runtimeConfig: GameConfigValues = gameConfigFromRow(null);
  private marketPrices: MarketPriceBook = marketPricesFromDb(null);
  private opsDepthConfig: OpsDepthConfig = opsDepthFromDb(null);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshConfig();
  }

  async refreshConfig() {
    const row = await this.prisma.gameConfig.findUnique({ where: { id: 1 } });
    this.runtimeConfig = gameConfigFromRow(row);
    this.marketPrices = marketPricesFromDb(row?.marketPrices);
    this.opsDepthConfig = opsDepthFromDb(row?.opsDepth);
  }

  get config(): GameConfigValues {
    return this.runtimeConfig;
  }

  get marketPriceBook(): MarketPriceBook {
    return this.marketPrices;
  }

  get opsDepth(): OpsDepthConfig {
    return this.opsDepthConfig;
  }

  displayGameTime(clock: WorldClock, nowMs: number) {
    return displayGameTime(clock, nowMs, this.config.timeScale);
  }

  settleWindow(lastSettledAtMs: number, nowRealMs: number) {
    return settleWindow({
      lastSettledAtMs,
      nowRealMs,
      timeScale: this.config.timeScale,
      maxOfflineRealSec: this.config.maxOfflineRealSec,
    });
  }

  settleProduction(status: BuildingStatus, queue: BuildingQueueJob[], gameDeltaSec: number) {
    return settleProduction({ status, queue, gameDeltaSec });
  }
}
