import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IngotHud } from "./IngotHud";
import type { InvRow } from "../types";

function inv(itemId: string, quantity: string): InvRow {
  return {
    itemId,
    quantity,
    item: { code: itemId, layer: "T", derivedTier: 1 },
  };
}

describe("IngotHud", () => {
  it("顯示銅→銀→金錠數量，銅錠 chip 可辨識", () => {
    const inventory: InvRow[] = [
      inv("item_copper_ingot", "10"),
      inv("item_silver_ingot", "2"),
      inv("item_gold_ingot", "1"),
    ];
    render(<IngotHud inventory={inventory} />);

    expect(screen.getByTestId("hud-copper-ingot")).toHaveTextContent("🟠 10");
    expect(screen.getByTestId("hud-silver-ingot")).toHaveTextContent("🥈 2");
    expect(screen.getByTestId("hud-gold-ingot")).toHaveTextContent("🥇 1");

    const chips = screen.getAllByText(/\d/);
    expect(chips[0]).toHaveAttribute("data-testid", "hud-copper-ingot");
  });

  it("銅錠可覆寫為結算餘額", () => {
    render(<IngotHud inventory={[inv("item_copper_ingot", "3")]} copperQty={17} />);
    expect(screen.getByTestId("hud-copper-ingot")).toHaveTextContent("🟠 17");
  });

  it("缺省為 0", () => {
    render(<IngotHud inventory={[]} />);
    expect(screen.getByTestId("hud-copper-ingot")).toHaveTextContent("🟠 0");
    expect(screen.getByTestId("hud-silver-ingot")).toHaveTextContent("🥈 0");
    expect(screen.getByTestId("hud-gold-ingot")).toHaveTextContent("🥇 0");
  });
});
