import { render, screen } from "@testing-library/react";
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

describe("Inventory FE-RICH-2 layout", () => {
  it("pins ingot and grain and groups intermediates", () => {
    render(
      <Inventory
        inventory={[
          row("item_bread", "2"),
          row("item_wheat", "10"),
          row("item_flour", "3"),
          row("item_copper_ingot", "5"),
        ]}
      />,
    );
    expect(screen.getByTestId("inventory-pinned")).toBeInTheDocument();
    expect(screen.getByTestId("inventory-section-intermediate")).toHaveTextContent("中間品");
    expect(screen.getByTitle("銅錠")).toBeInTheDocument();
    expect(screen.getByTitle("小麥")).toBeInTheDocument();
  });

  it("fades zero quantity tiles", () => {
    const { container } = render(<Inventory inventory={[row("item_wheat", "0")]} />);
    expect(container.querySelector(".item.empty")).toBeTruthy();
  });
});
