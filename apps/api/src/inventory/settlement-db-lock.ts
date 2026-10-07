import { Prisma, type PrismaClient } from "@prisma/client";

/** Postgres `pg_advisory_xact_lock` 鍵（ASCII「ASCS」）；交易結束自動釋放。 */
export const SETTLEMENT_ADVISORY_LOCK_KEY = 0x41534353;

export type SettlementTransactionClient = Prisma.TransactionClient;

export function isPostgresDatabase(url = process.env.DATABASE_URL ?? ""): boolean {
  return url.startsWith("postgresql://") || url.startsWith("postgres://");
}

/**
 * 在 Prisma interactive transaction 內取得跨 Node 實例的結算／收取互斥。
 * Postgres：advisory xact lock；SQLite：交易內首筆寫入 `server_state` 以序列化多連線寫入。
 */
export async function acquireSettlementLock(tx: SettlementTransactionClient): Promise<void> {
  if (isPostgresDatabase()) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SETTLEMENT_ADVISORY_LOCK_KEY})`;
    return;
  }
  await tx.serverState.update({
    where: { id: 1 },
    data: { lastUpdate: new Date() },
  });
}

export async function withSettlementTransaction<T>(
  prisma: Pick<PrismaClient, "$transaction">,
  fn: (tx: SettlementTransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await acquireSettlementLock(tx);
    return fn(tx);
  });
}
