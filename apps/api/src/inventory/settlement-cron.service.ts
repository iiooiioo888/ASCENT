import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { SchedulerRegistry } from "@nestjs/schedule";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "./inventory.service";

const JOB_NAME = "coarse-settlement";

/**
 * 粗粒度背景補算（間隔讀 game_config.tickIntervalRealMs）。
 * 不取代懶結算；僅在無前端輪詢時仍推進 lastSettledAt。
 */
@Injectable()
export class SettlementCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettlementCronService.name);
  private scheduledMs = 0;

  constructor(
    private readonly inventory: InventoryService,
    private readonly sim: SimulationService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === "test") return;
    await this.syncSchedule();
  }

  onModuleDestroy() {
    this.clearSchedule();
  }

  private clearSchedule() {
    if (!this.schedulerRegistry.doesExist("interval", JOB_NAME)) return;
    const handle = this.schedulerRegistry.getInterval<NodeJS.Timeout>(JOB_NAME);
    clearInterval(handle);
    this.schedulerRegistry.deleteInterval(JOB_NAME);
    this.scheduledMs = 0;
  }

  private async syncSchedule() {
    await this.sim.refreshConfig();
    const ms = Math.max(1000, Math.floor(this.sim.config.tickIntervalRealMs));
    if (ms === this.scheduledMs && this.schedulerRegistry.doesExist("interval", JOB_NAME)) {
      return;
    }
    this.clearSchedule();
    const handle = setInterval(() => void this.coarseTick(), ms);
    this.schedulerRegistry.addInterval(JOB_NAME, handle);
    this.scheduledMs = ms;
    this.logger.log(`背景結算間隔已設為 ${ms}ms（tickIntervalRealMs）`);
  }

  async coarseTick() {
    if (process.env.NODE_ENV === "test") return;
    try {
      await this.sim.refreshConfig();
      const ms = Math.max(1000, Math.floor(this.sim.config.tickIntervalRealMs));
      if (ms !== this.scheduledMs) {
        await this.syncSchedule();
      }
      await this.inventory.settleAll();
    } catch (err) {
      this.logger.warn(`背景結算略過：${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
