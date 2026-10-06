import { Module } from "@nestjs/common";
import { SimulationModule } from "../simulation/simulation.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { SettlementCronService } from "./settlement-cron.service";

@Module({
  imports: [SimulationModule],
  controllers: [InventoryController],
  providers: [InventoryService, SettlementCronService],
  exports: [InventoryService],
})
export class InventoryModule {}
