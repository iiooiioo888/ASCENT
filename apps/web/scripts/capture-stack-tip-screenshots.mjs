import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const outDir = path.join(webRoot, "screenshots");
const artifactsDir = "/opt/cursor/artifacts/screenshots";
const port = 5210;

const shots = [
  { name: "stack-depletion-ctas-market.png", query: "depletion", selector: "[data-shot-id='depletion-ctas']" },
  { name: "stack-well-card-highlight.png", query: "well", selector: "[data-shot-id='well-card']" },
  { name: "stack-trading-post-market-gold10.png", query: "market", selector: "[data-shot-id='trading-post-market']" },
  { name: "stack-go-market-scroll-highlight.png", query: "scroll", selector: "[data-shot-id='scroll-highlight']" },
];

function waitForServer(url, ms = 45000) {
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
  await waitForServer(`http://127.0.0.1:${port}/stack-tip-demo.html?shot=depletion`);
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  await mkdir(outDir, { recursive: true });
  await mkdir(artifactsDir, { recursive: true });

  for (const shot of shots) {
    const url = `http://127.0.0.1:${port}/stack-tip-demo.html?shot=${shot.query}`;
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("[data-screenshot-harness]", { timeout: 15000 });
    await page.waitForTimeout(400);
    const el = await page.$(shot.selector);
    const buffer = el
      ? await el.screenshot({ type: "png" })
      : await page.screenshot({ fullPage: true, type: "png" });
    const outFile = path.join(outDir, shot.name);
    await writeFile(outFile, buffer);
    await writeFile(path.join(artifactsDir, shot.name), buffer);
    console.log(`Wrote ${outFile}`);
    await page.close();
  }

  await browser.close();
} finally {
  vite.kill("SIGTERM");
}
