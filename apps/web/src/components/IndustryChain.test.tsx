import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { prgBuildings } from "../prg-demo/fixtures";
import { IndustryChain } from "./IndustryChain";

describe("IndustryChain (P3-3)", () => {
  it("includes feed branch and reflects building statuses", () => {
    render(<IndustryChain buildings={prgBuildings} />);
    expect(screen.getByLabelText(/飼料/)).toBeInTheDocument();
    expect(screen.getByText("飼料")).toBeInTheDocument();
    const field = screen.getByTitle(/田 · running/);
    expect(field).toHaveClass("running");
    expect(screen.queryByText("礦坑")).not.toBeInTheDocument();
  });

  it("shows only the selected industry chain", () => {
    render(<IndustryChain buildings={prgBuildings} industry="mining" />);
    expect(screen.getByText("礦坑")).toBeInTheDocument();
    expect(screen.getByText("冶煉爐")).toBeInTheDocument();
    expect(screen.queryByText("飼料")).not.toBeInTheDocument();
    expect(screen.queryByText("窯")).not.toBeInTheDocument();
  });
});
