import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
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
import { WriteThrottleGuard } from "./common/write-throttle.guard";
import { OrdersController } from "./orders/orders.controller";
import { OrdersModule } from "./orders/orders.module";

@Module({
  providers: [PlayerContextMiddleware, { provide: APP_GUARD, useClass: WriteThrottleGuard }],
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
    OrdersModule,
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
      OrdersController,
    );
  }
}
