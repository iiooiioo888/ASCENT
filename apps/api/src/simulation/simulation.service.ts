import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  displayGameTime,
  marketPricesFromDb,
  opsDepthFromDb,
  retailConfigFromDb,
  type RetailConfig,
  settleProduction,
  settleWindow,
  type BuildingQueueJob,
  type BuildingStatus,
  type EnvironmentConfig,
  type GameConfigValues,
  type MarketPriceBook,
  type OpsDepthConfig,
  type PersistedWeatherState,
  type WorldClock,
} from "@ascent/shared";
import { PrismaService } from "../prisma/prisma.service";
import { gameConfigFromRow } from "./game-config.loader";
import { EnvironmentRuntime } from "./environment-runtime";

@Injectable()
export class SimulationService implements OnModuleInit {
  private runtimeConfig: GameConfigValues = gameConfigFromRow(null);
  private marketPrices: MarketPriceBook = marketPricesFromDb(null);
  private opsDepthConfig: OpsDepthConfig = opsDepthFromDb(null);
  private readonly environmentRuntime = new EnvironmentRuntime();
  private retailConfigValues: RetailConfig = retailConfigFromDb(null);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshConfig();
  }

  async refreshConfig() {
    const row = await this.prisma.gameConfig.findUnique({ where: { id: 1 } });
    this.runtimeConfig = gameConfigFromRow(row);
    this.marketPrices = marketPricesFromDb(row?.marketPrices);
    this.opsDepthConfig = opsDepthFromDb(row?.opsDepth);
    this.environmentRuntime.setConfigFromDb(row?.environment);
    this.retailConfigValues = retailConfigFromDb(row?.retailConfig);
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

  get environmentConfig(): EnvironmentConfig {
    return this.environmentRuntime.configSnapshot;
  }

  async ensureWeatherFresh(
    tx: Pick<PrismaService, "serverState" | "gameConfig">,
    currentGameSec: number,
  ): Promise<PersistedWeatherState> {
    return this.environmentRuntime.ensureWeatherFresh(tx, currentGameSec);
  }

  environmentSnapshot(weatherState: PersistedWeatherState, currentGameSec: number) {
    return this.environmentRuntime.snapshot(weatherState, currentGameSec);
  }

  get retailConfig(): RetailConfig {
    return this.retailConfigValues;
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
