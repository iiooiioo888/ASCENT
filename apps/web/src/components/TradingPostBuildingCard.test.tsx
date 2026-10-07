import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MARKET_COPY } from "../marketCopy";
import { TRADING_POST_BUILDING_DEF_ID } from "../resource-loop-copy";
import { TradingPostBuildingCard } from "./TradingPostBuildingCard";

const tradingPost = {
  id: "b_shop",
  status: "idle" as const,
  buildingDefId: TRADING_POST_BUILDING_DEF_ID,
  buildingDef: { name: "莊外商行", allowedRuleIds: [] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
};

describe("TradingPostBuildingCard v1.2", () => {
  it("renders trade CTA and toggles market via callback", async () => {
    const user = userEvent.setup();
    const onToggleMarket = vi.fn();
    render(
      <TradingPostBuildingCard
        building={tradingPost}
        scrollAnchorId="building-b_shop"
        marketOpen={false}
        onToggleMarket={onToggleMarket}
      />,
    );

    expect(screen.getByTestId("trading-post-building-card")).toHaveAttribute("id", "building-b_shop");
    await user.click(screen.getByRole("button", { name: MARKET_COPY.tradeOpenCta }));
    expect(onToggleMarket).toHaveBeenCalledTimes(1);
  });
});
