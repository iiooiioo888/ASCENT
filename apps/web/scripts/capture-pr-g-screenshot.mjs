import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const outDir = path.join(webRoot, "screenshots");
const url = `http://127.0.0.1:5205/prg-demo.html`;

const shots = [
  {
    name: "pr-g-u12-u16-desktop-demo.png",
    viewport: { width: 1100, height: 900 },
  },
  {
    name: "pr-g-u12-u16-mobile-demo.png",
    viewport: { width: 360, height: 900 },
  },
];

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

const port = 5205;
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
  await mkdir(outDir, { recursive: true });
  await mkdir("/opt/cursor/artifacts/screenshots", { recursive: true });

  for (const shot of shots) {
    const page = await browser.newPage({ viewport: shot.viewport });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("[data-screenshot-harness]", { timeout: 15000 });
    await page.waitForTimeout(500);
    const buffer = await page.screenshot({ fullPage: true });
    const outFile = path.join(outDir, shot.name);
    await writeFile(outFile, buffer);
    await writeFile(path.join("/opt/cursor/artifacts/screenshots", shot.name), buffer);
    console.log(`Wrote ${outFile}`);
    await page.close();
  }

  await browser.close();
} finally {
  vite.kill("SIGTERM");
}
