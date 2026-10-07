import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { SimulationModule } from "../simulation/simulation.module";
import { WorkforceController } from "./workforce.controller";
import { WorkforceService } from "./workforce.service";

@Module({
  imports: [InventoryModule, SimulationModule],
  controllers: [WorkforceController],
  providers: [WorkforceService],
})
export class WorkforceModule {}
