import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { InventoryService } from "../src/inventory/inventory.service";
import { SettlementCronService } from "../src/inventory/settlement-cron.service";

export type TestAppOptions = {
  /** 若 true，coarseTick 委派至 settleAll（模擬背景結算，不依賴 NODE_ENV）。 */
  enableSettlementCron?: boolean;
};

export async function createTestApp(
  databaseUrl: string,
  options: TestAppOptions = {},
): Promise<{ app: INestApplication; moduleRef: TestingModule }> {
  process.env.DATABASE_URL = databaseUrl;

  (BigInt.prototype as unknown as { toJSON?: () => string }).toJSON = function toJSON() {
    return this.toString();
  };

  const builder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (options.enableSettlementCron) {
    builder.overrideProvider(SettlementCronService).useFactory({
      factory: (inventory: InventoryService) => ({
        coarseTick: () => inventory.settleAll(),
      }),
      inject: [InventoryService],
    });
  } else {
    builder.overrideProvider(SettlementCronService).useValue({
      coarseTick: async () => undefined,
    });
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return { app, moduleRef };
}
