import { PrismaClient } from "../../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaAdapter } from "../prisma/create-prisma-adapter";
import { isPostgresDatabase, withSettlementTransaction } from "./settlement-db-lock";

// ENV_GAP: Prisma 7 + better-sqlite3 雙連線 settlement 鎖在 SQLite 上易 transaction timeout；Postgres advisory lock 才穩定驗證。
const describeDbLock = isPostgresDatabase() ? describe : describe.skip;

describeDbLock("settlement-db-lock", () => {
  const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

  beforeAll(async () => {
    await prisma.$connect();
    const state = await prisma.serverState.findUnique({ where: { id: 1 } });
    if (!state) {
      throw new Error("測試需已種子的 server_state（請先 pnpm setup:db）");
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("同一 DB 上兩個 client 的 withSettlementTransaction 不會重疊執行", async () => {
    const other = new PrismaClient({ adapter: createPrismaAdapter() });
    await other.$connect();

    const log: string[] = [];
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const run = (name: string, client: PrismaClient) =>
      withSettlementTransaction(client, async () => {
        log.push(`${name}:start`);
        await delay(40);
        log.push(`${name}:end`);
      });

    await Promise.all([run("a", prisma), run("b", other)]);

    const aStart = log.indexOf("a:start");
    const aEnd = log.indexOf("a:end");
    const bStart = log.indexOf("b:start");
    const bEnd = log.indexOf("b:end");
    expect(aStart).toBeGreaterThanOrEqual(0);
    expect(bStart).toBeGreaterThanOrEqual(0);
    const aBeforeB = aEnd < bStart;
    const bBeforeA = bEnd < aStart;
    expect(aBeforeB || bBeforeA).toBe(true);

    await other.$disconnect();
  });
});
