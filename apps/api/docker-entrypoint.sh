#!/bin/sh
set -eu

# pnpm hoists CLI binaries here in the copied workspace node_modules tree.
export PATH="/app/node_modules/.pnpm/node_modules/.bin:$PATH"

cd /app/apps/api

echo "[ascent-api] Applying Prisma migrations..."
TRIES=0
MAX_TRIES=30
until prisma migrate deploy; do
  TRIES=$((TRIES + 1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo "[ascent-api] migrate deploy failed after ${MAX_TRIES} attempts"
    exit 1
  fi
  echo "[ascent-api] database not ready (attempt ${TRIES}/${MAX_TRIES}), retrying in 2s..."
  sleep 2
done

echo "[ascent-api] Checking whether seed is required..."
node <<'NODE'
const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

(async () => {
  const prisma = new PrismaClient();
  try {
    const players = await prisma.player.count();
    if (players === 0) {
      console.log("[ascent-api] Empty database — running seed...");
      execSync("tsx prisma/seed.ts", {
        stdio: "inherit",
        cwd: "/app/apps/api",
        env: process.env,
      });
    } else {
      console.log("[ascent-api] Database already has players — skipping seed.");
    }
  } finally {
    await prisma.$disconnect();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
NODE

echo "[ascent-api] Starting NestJS..."
exec node /app/apps/api/dist/main.js
