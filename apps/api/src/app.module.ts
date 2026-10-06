import { Module } from "@nestjs/common";
import { CatalogModule } from "./catalog/catalog.module";
import { InventoryModule } from "./inventory/inventory.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RulesModule } from "./rules/rules.module";
import { SimulationModule } from "./simulation/simulation.module";

@Module({
  imports: [PrismaModule, CatalogModule, RulesModule, SimulationModule, InventoryModule],
})
export class AppModule {}
