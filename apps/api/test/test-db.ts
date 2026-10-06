import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const apiRoot = path.join(__dirname, "..");

function prismaEnv(databaseUrl: string): NodeJS.ProcessEnv {
  return { ...process.env, DATABASE_URL: databaseUrl };
}

export function createEmptyTestDatabase(): string {
  const dir = path.join(__dirname, ".tmp");
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, `integration-${process.pid}-${Date.now()}.db`);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const databaseUrl = `file:${dbPath}`;
  execSync("pnpm exec prisma db push --skip-generate --accept-data-loss", {
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
  const filePath = databaseUrl.replace(/^file:/, "");
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
