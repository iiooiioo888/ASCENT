import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "./inventory.service";

/**
 * 粗粒度背景補算（對應 GDD tickIntervalRealMs）。
 * 不取代懶結算；僅在無前端輪詢時仍推進 lastSettledAt。
 */
@Injectable()
export class SettlementCronService {
  private readonly logger = new Logger(SettlementCronService.name);

  constructor(
    private readonly inventory: InventoryService,
    private readonly sim: SimulationService,
  ) {}

  @Cron("*/5 * * * * *")
  async coarseTick() {
    if (process.env.NODE_ENV === "test") return;
    try {
      await this.sim.refreshConfig();
      await this.inventory.settleAll();
    } catch (err) {
      this.logger.warn(`背景結算略過：${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
