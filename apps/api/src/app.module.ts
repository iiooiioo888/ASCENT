import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthController } from "./auth/auth.controller";
import { AuthModule } from "./auth/auth.module";
import { PlayerContextMiddleware } from "./auth/player-context.middleware";
import { CatalogController } from "./catalog/catalog.controller";
import { CatalogModule } from "./catalog/catalog.module";
import { InventoryController } from "./inventory/inventory.controller";
import { InventoryModule } from "./inventory/inventory.module";
import { MarketController } from "./market/market.controller";
import { MarketModule } from "./market/market.module";
import { WorkforceController } from "./workforce/workforce.controller";
import { WorkforceModule } from "./workforce/workforce.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RulesController } from "./rules/rules.controller";
import { RulesModule } from "./rules/rules.module";
import { SimulationModule } from "./simulation/simulation.module";

@Module({
  providers: [PlayerContextMiddleware],
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CatalogModule,
    RulesModule,
    SimulationModule,
    InventoryModule,
    MarketModule,
    WorkforceModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(PlayerContextMiddleware).forRoutes(
      AuthController,
      CatalogController,
      RulesController,
      InventoryController,
      MarketController,
      WorkforceController,
    );
  }
}
