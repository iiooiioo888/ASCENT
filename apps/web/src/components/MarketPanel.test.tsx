import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MARKET_COPY } from "../marketCopy";
import type { MarketSnapshot } from "../market";
import { MarketPanel } from "./MarketPanel";

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
    expect(screen.getByTestId("market-gold-balance")).toHaveTextContent("金幣 10");
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
});
