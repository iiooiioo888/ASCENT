import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { SimulationModule } from "../simulation/simulation.module";
import { MarketController } from "./market.controller";
import { MarketService } from "./market.service";
import { CommodityMarketService } from "./commodity-market.service";
import { RetailMarketService } from "./retail-market.service";

@Module({
  imports: [SimulationModule, InventoryModule],
  controllers: [MarketController],
  providers: [MarketService, CommodityMarketService, RetailMarketService],
})
export class MarketModule {}
