import type { MarketPriceBook } from "@ascent/shared";
import { formatQuantity } from "./format";
import { inventoryQtyMap } from "./inventory";
import { hudGoldChip, successBuy, successSell, successSellNet } from "./marketCopy";
import { itemLabel } from "./meta";
import type { InvRow } from "./types";

export const MARKET_PANEL_ANCHOR_ID = "market-panel";

export function goldBalanceFromInventory(inventory: InvRow[]): number {
  return inventoryQtyMap(inventory).get("item_gold") ?? 0;
}

/** Prefer authoritative market snapshot; fall back to inventory row. */
export function resolveHudGold(marketGold: number | null | undefined, inventory: InvRow[]): number {
  if (marketGold !== null && marketGold !== undefined) return marketGold;
  return goldBalanceFromInventory(inventory);
}

export function minMarketBuyUnitPrice(prices: MarketPriceBook | undefined): number {
  if (!prices?.buy) return Number.POSITIVE_INFINITY;
  const units = Object.values(prices.buy).filter((p) => p > 0);
  if (!units.length) return Number.POSITIVE_INFINITY;
  return Math.min(...units);
}

/** M-D13: highlight「前往商行」when player can afford at least one buy listing. */
export function canAffordAnyMarketBuy(gold: number, prices: MarketPriceBook | undefined): boolean {
  const min = minMarketBuyUnitPrice(prices);
  return Number.isFinite(min) && gold >= min;
}

export type MarketSellSuccessAmounts = {
  netGold: number;
  transportFee?: number;
};

export function formatMarketTradeSuccess(
  side: "sell" | "buy",
  itemId: string,
  quantity: number,
  goldAmount: number,
  sellAmounts?: MarketSellSuccessAmounts,
): string {
  const item = itemLabel(itemId);
  const q = formatQuantity(quantity);
  const n = formatQuantity(goldAmount);
  if (side === "sell" && sellAmounts) {
    const net = formatQuantity(sellAmounts.netGold);
    const fee =
      sellAmounts.transportFee !== undefined && sellAmounts.transportFee > 0
        ? formatQuantity(sellAmounts.transportFee)
        : undefined;
    return successSellNet(item, q, net, fee);
  }
  return side === "sell" ? successSell(item, q, n) : successBuy(item, q, n);
}

export function hudGoldChipLabel(gold: number): string {
  return hudGoldChip(gold);
}
