import { Module } from "@nestjs/common";
import { OrdersModule } from "../orders/orders.module";
import { SimulationModule } from "../simulation/simulation.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { SettlementCronService } from "./settlement-cron.service";

@Module({
  imports: [SimulationModule, OrdersModule],
  controllers: [InventoryController],
  providers: [InventoryService, SettlementCronService],
  exports: [InventoryService],
})
export class InventoryModule {}
