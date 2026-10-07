import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MARKET_COPY } from "../marketCopy";
import type { MarketSnapshot } from "../market";
import type { Building } from "../types";
import { TradingPostBuildingCard } from "./TradingPostBuildingCard";

const tradingPostBuilding: Building = {
  id: "pb_trading_post",
  status: "idle",
  buildingDefId: "bdef_trading_post",
  buildingDef: { name: "莊外商行", allowedRuleIds: [] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
};

const market: MarketSnapshot = {
  gold: 10,
  prices: {
    sell: { item_bread: 8, item_feed: 3, item_flour: 4, item_dough: 5, item_wheat: 2, item_straw: 1 },
    buy: { item_seed_wheat: 3, item_water: 1 },
  },
  holdings: {
    item_gold: 10,
    item_bread: 1,
    item_feed: 0,
    item_flour: 0,
    item_dough: 0,
    item_wheat: 0,
    item_straw: 0,
    item_seed_wheat: 0,
    item_water: 0,
  },
};

describe("TradingPostBuildingCard (v1.2)", () => {
  it("shows trade CTA and no production buttons", () => {
    render(
      <TradingPostBuildingCard
        building={tradingPostBuilding}
        marketOpen={false}
        onToggleMarket={vi.fn()}
        market={market}
        panelError={null}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: MARKET_COPY.tradeCta })).toBeInTheDocument();
    expect(screen.getByText(MARKET_COPY.buildingStatus)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "開工" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "停止" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "收取" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: MARKET_COPY.sellTab })).not.toBeInTheDocument();
  });

  it("opens market panel with buy/sell tabs when trading", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <TradingPostBuildingCard
        building={tradingPostBuilding}
        marketOpen={false}
        onToggleMarket={onToggle}
        market={market}
        panelError={null}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: MARKET_COPY.tradeCta }));
    expect(onToggle).toHaveBeenCalled();

    rerender(
      <TradingPostBuildingCard
        building={tradingPostBuilding}
        marketOpen={true}
        onToggleMarket={onToggle}
        market={market}
        panelError={null}
        pendingKeys={new Set()}
        onSell={vi.fn()}
        onBuy={vi.fn()}
      />,
    );

    const panel = document.getElementById("market-panel");
    expect(panel).toBeInTheDocument();
    expect(within(panel!).getByRole("heading", { level: 2, name: MARKET_COPY.title })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: MARKET_COPY.sellTab })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: MARKET_COPY.buyTab })).toBeInTheDocument();
    expect(screen.getByTestId("market-gold-balance")).toHaveTextContent("金幣 10");

    const breadRow = screen.getByTestId("market-row-sell-item_bread");
    expect(within(breadRow).getByRole("button", { name: MARKET_COPY.sellCta })).toBeEnabled();
  });
});
