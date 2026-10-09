import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, "../..");

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
  },
  webServer: [
    {
      command: "pnpm --filter @ascent/api exec -- tsx src/main.ts",
      cwd: repoRoot,
      url: "http://127.0.0.1:3000/api/v1/time",
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
      env: {
        ...process.env,
        PORT: "3000",
        WEB_ORIGIN: "http://127.0.0.1:5173",
        ASCENT_THROTTLE: "0",
      },
    },
    {
      command: "pnpm --filter @ascent/web dev -- --host 127.0.0.1 --port 5173",
      cwd: repoRoot,
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 90_000,
    },
  ],
});
