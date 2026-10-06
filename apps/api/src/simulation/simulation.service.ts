import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  displayGameTime,
  settleProduction,
  settleWindow,
  type BuildingQueueJob,
  type BuildingStatus,
  type GameConfigValues,
  type WorldClock,
} from "@ascent/shared";
import { PrismaService } from "../prisma/prisma.service";
import { gameConfigFromRow } from "./game-config.loader";

@Injectable()
export class SimulationService implements OnModuleInit {
  private runtimeConfig!: GameConfigValues;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshConfig();
  }

  async refreshConfig() {
    const row = await this.prisma.gameConfig.findUnique({ where: { id: 1 } });
    this.runtimeConfig = gameConfigFromRow(row);
  }

  get config(): GameConfigValues {
    return this.runtimeConfig;
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
