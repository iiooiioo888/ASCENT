import path from "node:path";
import { config as loadEnv } from "dotenv";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

let envLoaded = false;

function getDatabaseUrl(): string {
  if (!envLoaded) {
    loadEnv({ path: path.join(process.cwd(), ".env") });
    envLoaded = true;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL 未設定（請在 apps/api/.env 設定，或先執行 pnpm setup:env）");
  }
  return url;
}

/** 依 DATABASE_URL 建立 Prisma 7 必填的 driver adapter（SQLite 或 PostgreSQL）。 */
export function createPrismaAdapter() {
  const url = getDatabaseUrl();
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return new PrismaPg({ connectionString: url });
  }
  return new PrismaBetterSqlite3({ url });
}
