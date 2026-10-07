import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { InvRow } from "../types";
import { Inventory } from "./Inventory";

const row = (itemId: string, quantity: string): InvRow => ({
  itemId,
  quantity,
  item: { code: itemId, layer: "T", derivedTier: 0 },
});

describe("Inventory low stock hint", () => {
  it("marks water and seed at or below threshold", () => {
    const { container } = render(
      <Inventory
        inventory={[
          row("item_water", "5"),
          row("item_seed_wheat", "4"),
          row("item_wheat", "5"),
        ]}
      />,
    );
    const items = container.querySelectorAll(".item");
    expect(items[0]?.className).toContain("low-stock");
    expect(items[1]?.className).toContain("low-stock");
    expect(items[2]?.className).not.toContain("low-stock");
  });
});
