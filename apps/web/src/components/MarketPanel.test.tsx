import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LAND_COPY } from "../landCopy";
import { evaluateLandPurchaseUi } from "../land-purchase";
import { MARKET_COPY } from "../marketCopy";
import type { MarketSnapshot } from "../market";
import { OPS_DEPTH_COPY } from "../ops-depth-copy";
import type { OpsCostsSnapshot } from "../types";
import type { CommoditiesSnapshot } from "../commodities";
import { COMMODITY_COPY } from "../commodityCopy";
import type { RetailSnapshot } from "../retail";
import { RETAIL_COPY } from "../retailCopy";
import type { RetailShelfSnapshot } from "../retail-shelf";
import { RETAIL_SHELF_COPY } from "../retailShelfCopy";
import {
  MarketPanel,
  RETAIL_SHELF_PENDING_ASK_KEY,
  RETAIL_SHELF_PENDING_ENABLED_KEY,
  RETAIL_SHELF_PENDING_FOLLOW_MARKET_KEY,
  retailPendingKey,
} from "./MarketPanel";

function makeShelf(overrides?: Partial<RetailShelfSnapshot>): RetailShelfSnapshot {
  return {
    enabled: false,
    followMarket: true,
    ask: 8,
    todayRevenueGold: 3,
    skuId: "item_bread",
    ...overrides,
  };
}

function makeRetail(overrides?: Partial<RetailSnapshot>): RetailSnapshot {
  return {
    breadQty: 2,
    slotCount: 3,
    offers: [
      {
        offerId: "offer-1",
        skuId: "item_bread",
        qty: 2,
        bidGold: 9,
        buyerLabel: "路過村民",
      },
    ],
    ...overrides,
  };
}

function makeCommodities(overrides?: Partial<CommoditiesSnapshot>): CommoditiesSnapshot {
  return {
    gold: 10,
    feeRate: 0.01,
    minFeeGold: 1,
    maxQtyPerOrder: 20,
    listings: [
      {
        id: "oil",
        name: "石油",
        itemId: "item_oil",
        basePrice: 15,
        enabled: true,
        price: 15,
        change: 0,
        priceHistory: [{ t: 1, price: 15 }],
        holding: 0,
      },
    ],
    ...overrides,
  };
}

const defaultOpsCosts: OpsCostsSnapshot = {
  hireCostGold: 80,
  laborCostPerStart: 1,
  wageByBuilding: {},
  haulByBuilding: {},
  sellTransport: { item_bread: 1 },
};

function makeMarket(overrides?: Partial<MarketSnapshot>): MarketSnapshot {
  return {
    gold: 10,
    prices: {
      sell: {
        item_bread: 8,
        item_feed: 3,
        item_flour: 4,
        item_dough: 5,
        item_wheat: 2,
        item_straw: 1,
      },
      buy: {
        item_seed_wheat: 3,
        item_water: 1,
      },
    },
    holdings: {
      item_bread: 2,
      item_feed: 0,
      item_flour: 0,
      item_dough: 0,
      item_wheat: 0,
      item_straw: 0,
      item_seed_wheat: 0,
      item_water: 0,
      item_gold: 10,
    },
    ...overrides,
  };
}

describe("MarketPanel", () => {
  it("renders title, balance, and tabs", () => {
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: MARKET_COPY.title })).toBeInTheDocument();
    expect(screen.getByTestId("market-gold-balance")).toHaveTextContent("銅錠 10");
    expect(screen.getByRole("tab", { name: MARKET_COPY.sellTab })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: MARKET_COPY.buyTab })).toBeInTheDocument();
  });

  it("disables sell when stock is zero", () => {
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    const strawRow = screen.getByTestId("market-row-sell-item_straw");
    const sellBtn = within(strawRow).getByRole("button", { name: MARKET_COPY.sellCta });
    expect(sellBtn).toBeDisabled();
    expect(within(strawRow).getByText(MARKET_COPY.needStock)).toBeInTheDocument();
  });

  it("shows empty sell hint when nothing is sellable", () => {
    render(
      <MarketPanel
        market={makeMarket({
          holdings: {
            item_bread: 0,
            item_feed: 0,
            item_flour: 0,
            item_dough: 0,
            item_wheat: 0,
            item_straw: 0,
            item_gold: 0,
          },
        })}
        panelError={null}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    expect(screen.getByTestId("market-empty-sell")).toHaveTextContent(MARKET_COPY.emptySell);
  });

  it("disables buy when gold is insufficient", async () => {
    const user = userEvent.setup();
    render(
      <MarketPanel
        market={makeMarket({ gold: 0, holdings: { item_gold: 0, item_seed_wheat: 0, item_water: 0 } })}
        panelError={null}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: MARKET_COPY.buyTab }));
    const waterRow = screen.getByTestId("market-row-buy-item_water");
    const buyBtn = within(waterRow).getByRole("button", { name: MARKET_COPY.buyCta });
    expect(buyBtn).toBeDisabled();
    expect(within(waterRow).getByText(MARKET_COPY.needGold)).toBeInTheDocument();
  });

  it("calls onSell with quantity on success path", async () => {
    const user = userEvent.setup();
    const onSell = vi.fn();
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        onSell={onSell}
        onBuy={vi.fn()}
      />,
    );

    const breadRow = screen.getByTestId("market-row-sell-item_bread");
    await user.click(within(breadRow).getByRole("button", { name: MARKET_COPY.sellCta }));
    expect(onSell).toHaveBeenCalledWith("item_bread", 1);
  });

  it("shows success toast when provided", () => {
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        successToast="已售出 麵包×1，＋🪙8"
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );
    expect(screen.getByTestId("market-success-toast")).toHaveTextContent("已售出 麵包×1，＋🪙8");
  });

  it("switches to buy tab when tabFocusRequest updates", () => {
    const { rerender } = render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );
    expect(screen.getByRole("tab", { name: MARKET_COPY.sellTab })).toHaveAttribute("aria-selected", "true");

    rerender(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        tabFocusRequest={{ tab: "buy", seq: 1 }}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );
    expect(screen.getByRole("tab", { name: MARKET_COPY.buyTab })).toHaveAttribute("aria-selected", "true");
  });

  it("shows sell transport fee and net preview for bread (OD-FE-2)", () => {
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        opsCosts={defaultOpsCosts}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    const breadRow = screen.getByTestId("market-row-sell-item_bread");
    expect(within(breadRow).getByTestId("market-row-sell-fee")).toHaveTextContent(
      `${OPS_DEPTH_COPY.haul} −🪙1`,
    );
    expect(within(breadRow).getByTestId("market-row-sell-net")).toHaveTextContent(
      `${OPS_DEPTH_COPY.net} 🪙7`,
    );
  });

  it("disables sell when transport fee exceeds gross", () => {
    render(
      <MarketPanel
        market={makeMarket({
          prices: {
            sell: { item_bread: 0, item_feed: 3, item_flour: 4, item_dough: 5, item_wheat: 2, item_straw: 1 },
            buy: { item_seed_wheat: 3, item_water: 1 },
          },
        })}
        panelError={null}
        pendingKeys={new Set()}
        opsCosts={defaultOpsCosts}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    const breadRow = screen.getByTestId("market-row-sell-item_bread");
    const sellBtn = within(breadRow).getByRole("button", { name: MARKET_COPY.sellCta });
    expect(sellBtn).toBeDisabled();
    expect(within(breadRow).getByTestId("market-row-transport-hint")).toHaveTextContent(
      OPS_DEPTH_COPY.sellTransportTooHigh,
    );
  });

  it("hides commodities tab when not visible", () => {
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        commodities={makeCommodities()}
        commoditiesTabVisible={false}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("market-tab-commodities")).not.toBeInTheDocument();
  });

  it("shows commodities tab and oil sparkline when enabled", async () => {
    const user = userEvent.setup();
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        commodities={makeCommodities()}
        commoditiesTabVisible
        onSell={vi.fn()}
        onBuy={vi.fn()}
        onCommodityBuy={vi.fn()}
        onCommoditySell={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("market-tab-commodities"));
    expect(screen.getByTestId("market-commodities-panel")).toBeInTheDocument();
    expect(screen.getByTestId("commodity-sparkline-oil")).toBeInTheDocument();
    expect(screen.getByTestId("commodity-empty-hold")).toHaveTextContent(COMMODITY_COPY.empty);
  });

  it("disables commodity buy when gold is insufficient", async () => {
    const user = userEvent.setup();
    render(
      <MarketPanel
        market={makeMarket({ gold: 0 })}
        panelError={null}
        pendingKeys={new Set()}
        commodities={makeCommodities({ gold: 0 })}
        commoditiesTabVisible
        onSell={vi.fn()}
        onBuy={vi.fn()}
        onCommodityBuy={vi.fn()}
        onCommoditySell={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("market-tab-commodities"));
    const row = screen.getByTestId("commodity-row-oil");
    const buyBtn = within(row).getByRole("button", { name: COMMODITY_COPY.buyCta });
    expect(buyBtn).toBeDisabled();
    expect(within(row).getByText(COMMODITY_COPY.needGold)).toBeInTheDocument();
  });

  it("disables commodity sell when holding is zero", async () => {
    const user = userEvent.setup();
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        commodities={makeCommodities()}
        commoditiesTabVisible
        onSell={vi.fn()}
        onBuy={vi.fn()}
        onCommodityBuy={vi.fn()}
        onCommoditySell={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("market-tab-commodities"));
    const row = screen.getByTestId("commodity-row-oil");
    const sellBtn = within(row).getByRole("button", { name: COMMODITY_COPY.sellCta });
    expect(sellBtn).toBeDisabled();
  });

  it("renders expand field tab and calls purchase handler", async () => {
    const user = userEvent.setup();
    const onPurchaseField = vi.fn();
    const landPurchaseUi = evaluateLandPurchaseUi(
      { fieldCount: 1, fieldCap: 2, slottedBuildingCount: 5, buildingSlotCap: 6 },
      10,
    );

    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
        landPurchaseUi={landPurchaseUi}
        onPurchaseField={onPurchaseField}
      />,
    );

    await user.click(screen.getByTestId("market-tab-expand"));
    expect(screen.getByTestId("land-purchase-price")).toHaveTextContent("10");
    expect(screen.getByTestId("land-field-status")).toHaveTextContent("1／2");
    await user.click(screen.getByTestId("land-purchase-cta"));
    expect(onPurchaseField).toHaveBeenCalledOnce();
  });

  it("disables expand when blocked", async () => {
    const user = userEvent.setup();
    const landPurchaseUi = evaluateLandPurchaseUi(
      { fieldCount: 1, fieldCap: 2, slottedBuildingCount: 5, buildingSlotCap: 6 },
      5,
    );

    render(
      <MarketPanel
        market={makeMarket({ gold: 5 })}
        panelError={null}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
        landPurchaseUi={landPurchaseUi}
        onPurchaseField={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("market-tab-expand"));
    expect(screen.getByTestId("land-purchase-block-reason")).toHaveTextContent(LAND_COPY.needGold);
    expect(screen.getByTestId("land-purchase-cta")).toBeDisabled();
  });

  it("shows panel error message", () => {
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={{ message: MARKET_COPY.genericError }}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(MARKET_COPY.genericError);
  });

  it("hides retail tab when not visible", () => {
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        retail={makeRetail()}
        retailTabVisible={false}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("market-tab-retail")).not.toBeInTheDocument();
  });

  it("shows retail offers and disables accept when bread is insufficient", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        retail={makeRetail({ breadQty: 1 })}
        retailTabVisible
        onSell={vi.fn()}
        onBuy={vi.fn()}
        onRetailAccept={onAccept}
      />,
    );

    await user.click(screen.getByTestId("market-tab-retail"));
    expect(screen.getByTestId("market-retail-panel")).toBeInTheDocument();
    const card = screen.getByTestId("retail-offer-offer-1");
    expect(within(card).getByTestId("retail-offer-preview")).toHaveTextContent(
      RETAIL_COPY.preview(18),
    );
    const acceptBtn = within(card).getByTestId("retail-offer-accept");
    expect(acceptBtn).toBeDisabled();
    expect(within(card).getByTestId("retail-offer-need-stock")).toHaveTextContent(
      RETAIL_COPY.needStock,
    );
  });

  it("calls onRetailAccept when stock is sufficient", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        retail={makeRetail({ breadQty: 5 })}
        retailTabVisible
        onSell={vi.fn()}
        onBuy={vi.fn()}
        onRetailAccept={onAccept}
      />,
    );

    await user.click(screen.getByTestId("market-tab-retail"));
    await user.click(screen.getByTestId("retail-offer-accept"));
    expect(onAccept).toHaveBeenCalledWith("offer-1");
  });

  it("shows retail empty states", async () => {
    const user = userEvent.setup();
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        retail={makeRetail({ breadQty: 0, offers: [] })}
        retailTabVisible
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("market-tab-retail"));
    expect(screen.getByTestId("retail-empty-stock")).toHaveTextContent(RETAIL_COPY.emptyStock);
    expect(screen.getAllByTestId("retail-slot-empty")).toHaveLength(3);
  });

  it("shows unified retail tab when only shelf is visible", () => {
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        retailShelf={makeShelf()}
        retailShelfTabVisible
        retailTabVisible={false}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    expect(screen.getByTestId("market-tab-retail")).toBeInTheDocument();
    expect(screen.queryByTestId("market-tab-shelf")).not.toBeInTheDocument();
  });

  it("shows shelf controls inside retail tab with toggle, ask, and revenue", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onToggleFollowMarket = vi.fn();
    const onSaveAsk = vi.fn();

    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        retailShelf={makeShelf({ enabled: true, followMarket: false, ask: 10, todayRevenueGold: 15 })}
        retailShelfTabVisible
        onRetailShelfToggleEnabled={onToggle}
        onRetailShelfToggleFollowMarket={onToggleFollowMarket}
        onRetailShelfSaveAsk={onSaveAsk}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("market-tab-retail"));
    expect(screen.getByTestId("market-retail-panel")).toBeInTheDocument();
    expect(screen.getByTestId("retail-shelf-section")).toBeInTheDocument();
    expect(screen.getByTestId("retail-shelf-today-revenue")).toHaveTextContent(
      RETAIL_SHELF_COPY.todayRevenue(15),
    );
    expect(screen.getByTestId("retail-shelf-ask-value")).toHaveTextContent("10");

    await user.click(screen.getByTestId("retail-shelf-enabled"));
    expect(onToggle).toHaveBeenCalledWith(false);

    await user.click(screen.getByTestId("retail-shelf-follow-market"));
    expect(onToggleFollowMarket).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: "提高標價" }));
    await user.click(screen.getByTestId("retail-shelf-ask-apply"));
    expect(onSaveAsk).toHaveBeenCalledWith(11);
  });

  it("disables shelf ask apply while following market", async () => {
    const user = userEvent.setup();
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        retailShelf={makeShelf({ enabled: true, followMarket: true })}
        retailShelfTabVisible
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("market-tab-retail"));
    expect(screen.getByTestId("retail-shelf-ask-apply")).toBeDisabled();
    expect(screen.getByTestId("retail-shelf-follow-hint")).toBeInTheDocument();
  });

  it("disables shelf controls while pending", async () => {
    const user = userEvent.setup();
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={
          new Set([
            RETAIL_SHELF_PENDING_ENABLED_KEY,
            RETAIL_SHELF_PENDING_FOLLOW_MARKET_KEY,
            RETAIL_SHELF_PENDING_ASK_KEY,
          ])
        }
        retailShelf={makeShelf({ enabled: true })}
        retailShelfTabVisible
        retailShelfPendingEnabled
        retailShelfPendingFollowMarket
        retailShelfPendingAsk
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("market-tab-retail"));
    expect(screen.getByTestId("retail-shelf-enabled")).toBeDisabled();
    expect(screen.getByTestId("retail-shelf-follow-market")).toBeDisabled();
    expect(screen.getByTestId("retail-shelf-ask-apply")).toBeDisabled();
  });

  it("retail tab shows shelf and customer orders together", async () => {
    const user = userEvent.setup();
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set()}
        retail={makeRetail({ breadQty: 5 })}
        retailTabVisible
        retailShelf={makeShelf()}
        retailShelfTabVisible
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    expect(screen.getByTestId("market-tab-retail")).toBeInTheDocument();
    expect(screen.queryByTestId("market-tab-shelf")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("market-tab-retail"));
    expect(screen.getByTestId("retail-trading-panel")).toBeInTheDocument();
    expect(screen.getByTestId("retail-shelf-section")).toBeInTheDocument();
    expect(screen.getByTestId("retail-orders-section")).toBeInTheDocument();
    expect(screen.getByTestId("retail-slot-summary")).toHaveTextContent("槽位 1／3");
  });

  it("disables retail accept while pending", async () => {
    const user = userEvent.setup();
    render(
      <MarketPanel
        market={makeMarket()}
        panelError={null}
        pendingKeys={new Set([retailPendingKey("offer-1")])}
        retail={makeRetail({ breadQty: 5 })}
        retailTabVisible
        onSell={vi.fn()}
        onBuy={vi.fn()}
        onRetailAccept={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("market-tab-retail"));
    expect(screen.getByTestId("retail-offer-accept")).toBeDisabled();
  });
});
