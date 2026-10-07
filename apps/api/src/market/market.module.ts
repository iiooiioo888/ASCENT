import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { SimulationModule } from "../simulation/simulation.module";
import { EquityMarketService } from "./equity-market.service";
import { MarketController } from "./market.controller";
import { MarketService } from "./market.service";

@Module({
  imports: [SimulationModule, InventoryModule],
  controllers: [MarketController],
  providers: [MarketService, EquityMarketService],
})
export class MarketModule {}
