import path from "node:path";
import { config as loadEnv } from "dotenv";
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

const SUPPORTED_URL_MESSAGE =
  "不支援的 DATABASE_URL：僅支援 file:、sqlite:、postgres://、postgresql://（請檢查 apps/api/.env）";

/** 解析並驗證 DATABASE_URL 協定（可單測注入 url，避免誤用非 SQLite 協定）。 */
export function createPrismaAdapterFromUrl(url: string) {
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith("postgres://") || lower.startsWith("postgresql://")) {
    return new PrismaPg({ connectionString: trimmed });
  }
  if (lower.startsWith("file:") || lower.startsWith("sqlite:")) {
    // Lazy require so Postgres-only deployments (e.g. Docker prod) never load better-sqlite3.
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");
    return new PrismaBetterSqlite3({ url: trimmed });
  }

  const schemeEnd = trimmed.indexOf("://");
  const scheme = schemeEnd >= 0 ? trimmed.slice(0, schemeEnd) : trimmed.slice(0, 32);
  throw new Error(`${SUPPORTED_URL_MESSAGE}；目前協定：${scheme}://`);
}

/** 依 DATABASE_URL 建立 Prisma 7 必填的 driver adapter（SQLite 或 PostgreSQL）。 */
export function createPrismaAdapter() {
  return createPrismaAdapterFromUrl(getDatabaseUrl());
}
