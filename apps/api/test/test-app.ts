import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { SettlementCronService } from "../src/inventory/settlement-cron.service";

export type TestAppOptions = {
  /** 若 true，啟用真實 SettlementCronService.coarseTick（預設在測試環境暫停）。 */
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
      pauseBackgroundTicksForTests: () => undefined,
      resumeBackgroundTicksForTests: () => undefined,
    });
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  await app.init();

  if (options.enableSettlementCron) {
    moduleRef.get(SettlementCronService).resumeBackgroundTicksForTests();
  }

  return { app, moduleRef };
}
