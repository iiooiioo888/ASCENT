import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BuildingCardRecipeRow } from "./BuildingCardRecipeRow";

describe("BuildingCardRecipeRow (FE-RICH-1)", () => {
  it("renders input arrow output on one row", () => {
    render(<BuildingCardRecipeRow inputs="🌾 小麥×1" outputs="🍞 麵包×1" />);
    const row = screen.getByTestId("building-recipe-row");
    expect(row).toHaveTextContent("🌾 小麥×1");
    expect(row).toHaveTextContent("→");
    expect(row).toHaveTextContent("🍞 麵包×1");
  });
});
