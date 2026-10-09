import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../api");

function advanceSettlement(seconds = 180): void {
  let lastErr: unknown;
  for (let i = 0; i < 5; i++) {
    try {
      execSync(`pnpm exec tsx scripts/e2e-advance-settlement.ts ${seconds}`, {
        cwd: apiRoot,
        stdio: "pipe",
      });
      return;
    } catch (err) {
      lastErr = err;
      const until = Date.now() + 200 * (i + 1);
      while (Date.now() < until) {
        /* sqlite busy backoff */
      }
    }
  }
  throw lastErr;
}

async function plot(page: Page, heading: string) {
  return page.locator(".plot", { has: page.getByRole("heading", { name: heading }) });
}

async function enterWorld(page: Page): Promise<void> {
  await page.goto("/");
  const field = page.getByRole("heading", { name: "田" });
  if (await field.isVisible().catch(() => false)) return;

  const registerSwitch = page.getByRole("button", { name: "還沒有名字？註冊" });
  if (await registerSwitch.isVisible()) {
    await registerSwitch.click();
  }
  await page.getByLabel("名字").fill("e2efarmer");
  await page.getByLabel("密碼").fill("field-water");
  await page.getByRole("button", { name: "註冊" }).click();
  try {
    await expect(field).toBeVisible({ timeout: 15_000 });
    return;
  } catch {
    await page.getByRole("button", { name: "已有名字？登入" }).click();
    await page.getByLabel("名字").fill("e2efarmer");
    await page.getByLabel("密碼").fill("field-water");
    await page.getByRole("button", { name: "登入" }).click();
    await expect(field).toBeVisible({ timeout: 30_000 });
  }
}

async function startAndCollect(page: Page, heading: string, methodId?: string): Promise<void> {
  const card = await plot(page, heading);
  if (methodId) {
    await card.getByLabel(`選擇${heading}的生產方式`).selectOption(methodId);
  }
  await card.getByRole("button", { name: "開工" }).click();
  await expect((await plot(page, heading)).getByRole("button", { name: "開工" })).toBeDisabled({
    timeout: 20_000,
  });
  advanceSettlement(180);
  await page.reload();
  await expect(page.getByRole("heading", { name: "田" })).toBeVisible({ timeout: 30_000 });
  const ready = await plot(page, heading);
  await expect(ready.getByRole("button", { name: "收取" })).toBeEnabled({
    timeout: 20_000,
  });
  await ready.getByRole("button", { name: "收取" }).click();
  await expect((await plot(page, heading)).getByRole("button", { name: "收取" })).toBeDisabled({
    timeout: 20_000,
  });
}

test("種→磨→麵→烤後可在商行買賣", async ({ page }) => {
  await enterWorld(page);
  await expect(page.getByRole("heading", { name: "田" })).toBeVisible({ timeout: 30_000 });

  await startAndCollect(page, "田", "method_grow_wheat_default");
  await startAndCollect(page, "磨坊", "method_mill_flour_default");
  await startAndCollect(page, "爐", "method_make_dough_default");
  await startAndCollect(page, "爐", "method_bake_bread_default");

  await page.getByTestId("trading-post-building-card").getByRole("button", { name: "交易" }).click();
  const sellRow = page.getByTestId("market-row-sell-item_bread");
  await expect(sellRow).toBeVisible();
  await sellRow.getByRole("button", { name: "賣出" }).click();
  await page.getByRole("tab", { name: "買入" }).click();
  const buyRow = page.getByTestId("market-row-buy-item_water");
  await expect(buyRow).toBeVisible();
  await buyRow.getByRole("button", { name: "買入" }).click();
});
