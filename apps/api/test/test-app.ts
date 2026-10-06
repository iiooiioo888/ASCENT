import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { SettlementCronService } from "../src/inventory/settlement-cron.service";

export type TestAppOptions = {
  /** 若 false，以空實作取代背景 cron（預設）。並發測試需 true。 */
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

  if (!options.enableSettlementCron) {
    builder.overrideProvider(SettlementCronService).useValue({
      coarseTick: async () => undefined,
    });
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return { app, moduleRef };
}
