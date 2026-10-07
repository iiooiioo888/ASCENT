import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RetailShelfSnapshot } from "../retail-shelf";
import { RETAIL_SHELF_COPY } from "../retailShelfCopy";
import { RetailShelfPanel } from "./RetailShelfPanel";

function makeShelf(overrides?: Partial<RetailShelfSnapshot>): RetailShelfSnapshot {
  return {
    enabled: true,
    followMarket: true,
    ask: 10,
    todayRevenueGold: 0,
    skuId: "item_bread",
    ...overrides,
  };
}

function renderPanel(
  shelf: RetailShelfSnapshot,
  overrides?: Partial<{
    pendingEnabled: boolean;
    pendingFollowMarket: boolean;
    pendingAsk: boolean;
    onToggleEnabled: (enabled: boolean) => void;
    onToggleFollowMarket: (followMarket: boolean) => void;
    onSaveAsk: (ask: number) => void;
  }>,
) {
  const onToggleEnabled = overrides?.onToggleEnabled ?? vi.fn();
  const onToggleFollowMarket = overrides?.onToggleFollowMarket ?? vi.fn();
  const onSaveAsk = overrides?.onSaveAsk ?? vi.fn();
  render(
    <RetailShelfPanel
      shelf={shelf}
      pendingEnabled={overrides?.pendingEnabled ?? false}
      pendingFollowMarket={overrides?.pendingFollowMarket ?? false}
      pendingAsk={overrides?.pendingAsk ?? false}
      onToggleEnabled={onToggleEnabled}
      onToggleFollowMarket={onToggleFollowMarket}
      onSaveAsk={onSaveAsk}
    />,
  );
  return { onToggleEnabled, onToggleFollowMarket, onSaveAsk };
}

describe("RetailShelfPanel follow market", () => {
  it("toggles follow market via switch", async () => {
    const user = userEvent.setup();
    const { onToggleFollowMarket } = renderPanel(makeShelf({ followMarket: true }));

    await user.click(screen.getByTestId("retail-shelf-follow-market"));
    expect(onToggleFollowMarket).toHaveBeenCalledWith(false);
  });

  it("disables ask stepper and apply while following market", () => {
    renderPanel(makeShelf({ followMarket: true, ask: 12 }));

    expect(screen.getByTestId("retail-shelf-ask-auto")).toHaveTextContent(RETAIL_SHELF_COPY.askAutoBadge);
    expect(screen.getByTestId("retail-shelf-follow-hint")).toHaveTextContent(RETAIL_SHELF_COPY.followMarketHint);
    expect(screen.getByRole("button", { name: "提高標價" })).toBeDisabled();
    expect(screen.getByTestId("retail-shelf-ask-apply")).toBeDisabled();
  });

  it("allows manual ask when follow market is off", async () => {
    const user = userEvent.setup();
    const { onSaveAsk } = renderPanel(makeShelf({ followMarket: false, ask: 10 }));

    expect(screen.queryByTestId("retail-shelf-follow-hint")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "提高標價" }));
    await user.click(screen.getByTestId("retail-shelf-ask-apply"));
    expect(onSaveAsk).toHaveBeenCalledWith(11);
  });

  it("disables follow market switch while pending", () => {
    renderPanel(makeShelf(), { pendingFollowMarket: true });
    expect(screen.getByTestId("retail-shelf-follow-market")).toBeDisabled();
  });
});
