import { DEFAULT_MARKET_PRICES } from "@ascent/shared";
import { describe, expect, it } from "vitest";
import {
  canAffordAnyMarketBuy,
  formatMarketTradeSuccess,
  goldBalanceFromInventory,
  hudGoldChipLabel,
  resolveHudGold,
} from "./market-feedback";

describe("market-feedback MK-FE-2", () => {
  it("formats sell/buy success copy per UX §5.2", () => {
    expect(formatMarketTradeSuccess("sell", "item_bread", 2, 16)).toBe("已售出 麵包×2，＋🪙16");
    expect(formatMarketTradeSuccess("buy", "item_seed_wheat", 1, 3)).toBe("已購入 小麥種子×1，－🪙3");
  });

  it("formats sell success with net and transport fee (OD-FE-2)", () => {
    expect(
      formatMarketTradeSuccess("sell", "item_bread", 1, 8, { netGold: 7, transportFee: 1 }),
    ).toBe("已售出 麵包×1，實收 🪙7（運費 🪙1）");
    expect(formatMarketTradeSuccess("sell", "item_bread", 1, 8, { netGold: 8 })).toBe(
      "已售出 麵包×1，實收 🪙8",
    );
  });

  it("resolves HUD gold from market snapshot or inventory", () => {
    const inventory = [{ itemId: "item_gold", quantity: "5", item: { code: "item_gold", layer: "T", derivedTier: 1 } }];
    expect(resolveHudGold(12, inventory)).toBe(12);
    expect(resolveHudGold(undefined, inventory)).toBe(5);
    expect(goldBalanceFromInventory(inventory)).toBe(5);
    expect(hudGoldChipLabel(7)).toBe("🪙 7");
  });

  it("detects when depletion market CTA should be prominent", () => {
    expect(canAffordAnyMarketBuy(0, DEFAULT_MARKET_PRICES)).toBe(false);
    expect(canAffordAnyMarketBuy(1, DEFAULT_MARKET_PRICES)).toBe(true);
  });
});
