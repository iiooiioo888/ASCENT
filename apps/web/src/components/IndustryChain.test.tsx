import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { prgBuildings } from "../prg-demo/fixtures";
import { IndustryChain } from "./IndustryChain";

describe("IndustryChain (P3-3)", () => {
  it("includes feed branch and reflects building statuses", () => {
    render(<IndustryChain buildings={prgBuildings} />);
    expect(screen.getByLabelText(/飼料/)).toBeInTheDocument();
    expect(screen.getByText("飼料")).toBeInTheDocument();
    expect(screen.getByText("牧場")).toBeInTheDocument();
    expect(screen.getByText("雞蛋")).toBeInTheDocument();
    expect(screen.getByText("牛奶")).toBeInTheDocument();
    const field = screen.getByTitle(/田 · running/);
    expect(field).toHaveClass("running");
  });
});
