import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RetailSnapshot } from "../retail";
import type { RetailShelfSnapshot } from "../retail-shelf";
import { RETAIL_SHELF_COPY } from "../retailShelfCopy";
import { RetailTradingPanel } from "./RetailTradingPanel";

function makeShelf(overrides?: Partial<RetailShelfSnapshot>): RetailShelfSnapshot {
  return {
    enabled: true,
    followMarket: false,
    ask: 8,
    todayRevenueGold: 4,
    skuId: "item_bread",
    ...overrides,
  };
}

function makeRetail(overrides?: Partial<RetailSnapshot>): RetailSnapshot {
  return {
    breadQty: 3,
    slotCount: 3,
    offers: [
      {
        offerId: "offer-1",
        skuId: "item_bread",
        qty: 1,
        bidGold: 7,
        expiresAt: Date.now() + 60_000,
      },
    ],
    ...overrides,
  };
}

describe("RetailTradingPanel", () => {
  it("renders shelf and orders on one screen", () => {
    render(
      <RetailTradingPanel
        retail={makeRetail()}
        retailVisible
        shelf={makeShelf()}
        shelfVisible
        pendingKeys={new Set()}
        retailPendingKeyForOffer={(id) => `retail:accept:${id}`}
        shelfPendingEnabled={false}
        shelfPendingFollowMarket={false}
        shelfPendingAsk={false}
      />,
    );

    expect(screen.getByTestId("retail-trading-panel")).toBeInTheDocument();
    expect(screen.getByTestId("retail-shelf-section")).toBeInTheDocument();
    expect(screen.getByText(RETAIL_SHELF_COPY.sectionTitle)).toBeInTheDocument();
    expect(screen.getByTestId("retail-shelf-panel")).toBeInTheDocument();
    expect(screen.getByTestId("retail-orders-section")).toBeInTheDocument();
    expect(screen.getByTestId("retail-slot-summary")).toHaveTextContent("槽位 1／3");
    expect(screen.getAllByTestId("retail-slot-empty")).toHaveLength(2);
  });

  it("wires shelf toggle callback", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <RetailTradingPanel
        retail={makeRetail()}
        retailVisible
        shelf={makeShelf()}
        shelfVisible
        pendingKeys={new Set()}
        retailPendingKeyForOffer={(id) => `retail:accept:${id}`}
        shelfPendingEnabled={false}
        shelfPendingFollowMarket={false}
        shelfPendingAsk={false}
        onShelfToggleEnabled={onToggle}
      />,
    );

    await user.click(screen.getByTestId("retail-shelf-enabled"));
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
