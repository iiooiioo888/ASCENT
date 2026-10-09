import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HudPrimaryChips } from "./HudPrimaryChips";
import type { InvRow } from "../types";

function inv(itemId: string, quantity: string): InvRow {
  return {
    itemId,
    quantity,
    item: { code: itemId, layer: "T", derivedTier: 1 },
  };
}

describe("HudPrimaryChips", () => {
  const time = { displayGameTime: 0, timeScale: 60, serverRealTime: "2026-01-01T00:00:00.000Z" };

  it("主要 chip 不超過 5（時鐘＋三錠＋工位）", () => {
    render(
      <HudPrimaryChips
        inventory={[inv("item_copper_ingot", "1")]}
        copperQty={1}
        time={time}
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        showWorkforceSummary
      />,
    );
    const primary = screen.getByTestId("hud-primary-chips");
    expect(primary.querySelectorAll(".chip").length).toBeLessThanOrEqual(5);
    expect(screen.getByTestId("hud-game-clock")).toBeInTheDocument();
    expect(screen.getByTestId("hud-workforce-chip")).toHaveTextContent("👷 1/4·忙0");
  });

  it("無工位資料時僅時鐘與三錠", () => {
    render(
      <HudPrimaryChips
        inventory={[]}
        copperQty={0}
        time={time}
        showWorkforceSummary={false}
      />,
    );
    expect(screen.queryByTestId("hud-workforce-chip")).not.toBeInTheDocument();
    expect(screen.getByTestId("hud-primary-chips").querySelectorAll(".chip").length).toBe(4);
  });
});
