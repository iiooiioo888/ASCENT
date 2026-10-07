import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { demoSiloBuilding } from "../screenshot-harness/fixtures";
import { SiloBuildingCard } from "./SiloBuildingCard";

describe("SiloBuildingCard (U12)", () => {
  it("hides production action buttons", () => {
    render(<SiloBuildingCard building={demoSiloBuilding} pending={false} />);
    expect(screen.queryByRole("button", { name: "開工" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "停止" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "收取" })).not.toBeInTheDocument();
    expect(screen.getByText(/倉庫已隱藏/)).toBeInTheDocument();
  });
});
