import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { isPostgresDatabase } from "../src/inventory/settlement-db-lock";

const apiRoot = path.join(__dirname, "..");
loadEnv({ path: path.join(apiRoot, ".env") });

function prismaEnv(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION:
      process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION ?? "yes",
  };
}

/** CI／本機 Postgres：`DATABASE_URL` 為 postgresql:// 時沿用，不建臨時 file: DB。 */
function resolvePostgresTestDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !isPostgresDatabase(url)) return undefined;
  return url;
}

function execWithRetry(command: string, databaseUrl: string, attempts = 5): void {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      execSync(command, {
        cwd: apiRoot,
        env: prismaEnv(databaseUrl),
        stdio: "pipe",
      });
      return;
    } catch (err) {
      lastErr = err;
      const delay = 500 * (i + 1);
      const until = Date.now() + delay;
      while (Date.now() < until) {
        /* migrate retry backoff */
      }
    }
  }
  throw lastErr;
}

export function createEmptyTestDatabase(): string {
  const postgresUrl = resolvePostgresTestDatabaseUrl();
  if (postgresUrl) {
    execWithRetry("pnpm exec prisma migrate deploy", postgresUrl);
    return postgresUrl;
  }

  const dir = path.join(__dirname, ".tmp");
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, `integration-${process.pid}-${Date.now()}.db`);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const databaseUrl = `file:${dbPath}`;
  // 與 pnpm setup:db 相同：SQLite 不支援 migration 內 PostgreSQL GIN 語法，用 schema push。
  execSync("pnpm exec prisma db push --accept-data-loss", {
    cwd: apiRoot,
    env: prismaEnv(databaseUrl),
    stdio: "pipe",
  });
  return databaseUrl;
}

export function seedTestDatabase(databaseUrl: string): void {
  execSync("pnpm exec tsx prisma/seed.ts", {
    cwd: apiRoot,
    env: prismaEnv(databaseUrl),
    stdio: "pipe",
  });
}

export function removeTestDatabase(databaseUrl: string): void {
  if (isPostgresDatabase(databaseUrl)) return;
  const filePath = databaseUrl.replace(/^file:/, "");
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
