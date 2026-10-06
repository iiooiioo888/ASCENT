import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BuildingCard } from "./BuildingCard";
import { demoFieldIdle, growWheatDefault } from "../prb-demo/fixtures";

const baseInventory = [
  {
    itemId: "item_seed_wheat",
    quantity: "40",
    item: { code: "item_seed_wheat", layer: "T", derivedTier: 0 },
  },
  {
    itemId: "item_water",
    quantity: "80",
    item: { code: "item_water", layer: "T", derivedTier: 0 },
  },
];

describe("BuildingCard a11y (U15)", () => {
  it("associates method select with a visible label", () => {
    render(
      <BuildingCard
        building={demoFieldIdle}
        options={[growWheatDefault]}
        inventory={baseInventory}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        timeScale={60}
        pending={false}
        onSelectMethod={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onCollect={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: "選擇田的生產方式" })).toBeInTheDocument();
    expect(screen.getByText("選擇田的生產方式")).toHaveAttribute("for", "method-select-demo-field");
  });

  it("exposes progressbar when running", () => {
    const running = {
      ...demoFieldIdle,
      status: "running" as const,
      methodId: growWheatDefault.id,
      queue: [{ elapsedGameSec: 1800, durationGameSec: 3600 }],
    };
    render(
      <BuildingCard
        building={running}
        options={[growWheatDefault]}
        inventory={baseInventory}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        timeScale={60}
        pending={false}
        onSelectMethod={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onCollect={vi.fn()}
      />,
    );

    const bar = screen.getByRole("progressbar", { name: "田生產進度 50%" });
    expect(bar).toHaveAttribute("aria-valuenow", "50");
  });

  it("announces action errors with role alert", () => {
    render(
      <BuildingCard
        building={demoFieldIdle}
        options={[growWheatDefault]}
        inventory={baseInventory}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        timeScale={60}
        actionError="資源不足：水"
        pending={false}
        onSelectMethod={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onCollect={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("資源不足：水");
  });
});
