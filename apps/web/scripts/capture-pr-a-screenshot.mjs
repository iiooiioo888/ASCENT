import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const outDir = path.join(webRoot, "screenshots");
const outFile = path.join(outDir, "pr-a-u1-u3-demo.png");
const artifactsCopy = "/opt/cursor/artifacts/screenshots/pr-a-u1-u3-demo.png";

const port = 5199;
const url = `http://127.0.0.1:${port}/screenshot-harness.html`;

function waitForServer(ms = 45000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch {
        /* retry */
      }
      if (Date.now() - start > ms) return reject(new Error("Vite did not become ready"));
      setTimeout(tick, 250);
    };
    tick();
  });
}

const vite = spawn(
  "pnpm",
  ["exec", "vite", "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
  {
    cwd: webRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
  },
);

vite.stderr?.on("data", (chunk) => process.stderr.write(chunk));

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage({ viewport: { width: 960, height: 1100 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector("[data-screenshot-harness]", { timeout: 15000 });
  await page.waitForTimeout(500);
  await mkdir(outDir, { recursive: true });
  const buffer = await page.screenshot({ fullPage: true });
  await writeFile(outFile, buffer);
  await mkdir(path.dirname(artifactsCopy), { recursive: true });
  await writeFile(artifactsCopy, buffer);
  await browser.close();
  console.log(`Wrote ${outFile}`);
} finally {
  vite.kill("SIGTERM");
}
