import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EquitySnapshot, EquityTicker } from "../equity";
import { EQUITY_COPY } from "../equityCopy";
import { EquityRow } from "./EquityRow";

const ticker: EquityTicker = {
  id: "eq_wheat_coop",
  name: "糧莊",
  basePrice: 10,
  currentPrice: 10,
  change: 0,
  priceHistory: [{ t: 1, price: 9 }, { t: 2, price: 10 }],
};

function makeSnapshot(overrides?: Partial<EquitySnapshot>): EquitySnapshot {
  return {
    gold: 10,
    feeRate: 0.02,
    minFeeGold: 1,
    maxSharesPerEquity: 50,
    maxQtyPerOrder: 10,
    holdings: { eq_wheat_coop: 0 },
    tickers: [ticker],
    ...overrides,
  };
}

describe("EquityRow", () => {
  it("disables buy when gold insufficient for total with fee", () => {
    render(
      <EquityRow
        ticker={ticker}
        snapshot={makeSnapshot({ gold: 5 })}
        quantity={1}
        pendingBuy={false}
        pendingSell={false}
        onQuantityChange={vi.fn()}
        onBuy={vi.fn()}
        onSell={vi.fn()}
      />,
    );
    const row = screen.getByTestId("equity-row-eq_wheat_coop");
    expect(within(row).getByRole("button", { name: EQUITY_COPY.buyCta })).toBeDisabled();
    expect(within(row).getByText(EQUITY_COPY.needGold)).toBeInTheDocument();
  });

  it("disables sell when fee exceeds notional", () => {
    render(
      <EquityRow
        ticker={{ ...ticker, currentPrice: 0 }}
        snapshot={makeSnapshot({ holdings: { eq_wheat_coop: 5 } })}
        quantity={1}
        pendingBuy={false}
        pendingSell={false}
        onQuantityChange={vi.fn()}
        onBuy={vi.fn()}
        onSell={vi.fn()}
      />,
    );
    const row = screen.getByTestId("equity-row-eq_wheat_coop");
    expect(within(row).getByRole("button", { name: EQUITY_COPY.sellCta })).toBeDisabled();
    expect(within(row).getByTestId("equity-row-fee-hint")).toHaveTextContent(EQUITY_COPY.feeHigh);
  });
});
