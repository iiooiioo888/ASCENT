import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SchedulerRegistry } from "@nestjs/schedule";
import { SettlementCronService } from "./settlement-cron.service";

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walkTsFiles(full, acc);
    } else if (name.endsWith(".ts") && !name.endsWith(".test.ts") && !name.endsWith(".e2e-spec.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

describe("SettlementCronService 測試控制 (QA PR#8)", () => {
  it("(f) pause/resumeBackgroundTicksForTests 僅由測試／服務定義引用", () => {
    const repoRoot = join(__dirname, "../../../..");
    const apiRoot = join(repoRoot, "apps/api");
    const offenders: string[] = [];

    for (const file of walkTsFiles(apiRoot)) {
      const rel = relative(repoRoot, file);
      const text = readFileSync(file, "utf8");
      if (!text.includes("pauseBackgroundTicksForTests") && !text.includes("resumeBackgroundTicksForTests")) {
        continue;
      }
      const allowed =
        rel === "apps/api/src/inventory/settlement-cron.service.ts" ||
        rel === "apps/api/test/test-app.ts" ||
        rel.endsWith(".e2e-spec.ts");
      if (!allowed) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it("(f) resume 後會排程 interval；pause 會清除，避免測試漏清", async () => {
    const registry = new SchedulerRegistry();
    const inventory = { settleAll: vi.fn().mockResolvedValue(undefined) };
    const sim = {
      refreshConfig: vi.fn().mockResolvedValue(undefined),
      config: { tickIntervalRealMs: 1000 },
    };
    const cron = new SettlementCronService(
      inventory as never,
      sim as never,
      registry,
    );

    expect(registry.doesExist("interval", "coarse-settlement")).toBe(false);
    cron.resumeBackgroundTicksForTests();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(registry.doesExist("interval", "coarse-settlement")).toBe(true);

    cron.pauseBackgroundTicksForTests();
    expect(registry.doesExist("interval", "coarse-settlement")).toBe(false);
  });

  it("(f) 非 test 環境建構時 onModuleInit 會排程（模擬 production）", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const registry = new SchedulerRegistry();
      const inventory = { settleAll: vi.fn().mockResolvedValue(undefined) };
      const sim = {
        refreshConfig: vi.fn().mockResolvedValue(undefined),
        config: { tickIntervalRealMs: 1500 },
      };
      const cron = new SettlementCronService(
        inventory as never,
        sim as never,
        registry,
      );
      await cron.onModuleInit();
      expect(registry.doesExist("interval", "coarse-settlement")).toBe(true);
      cron.onModuleDestroy();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
