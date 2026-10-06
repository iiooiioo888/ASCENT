import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BuildingCard } from "../components/BuildingCard";
import { demoFieldIdle, growWheatDefault } from "../prb-demo/fixtures";

const baseInventory = [
  {
    itemId: "item_seed_wheat",
    quantity: "40",
    item: { code: "item_seed_wheat", layer: "T", derivedTier: 0 },
  },
];

const baseProps = {
  options: [growWheatDefault],
  inventory: baseInventory,
  timeScale: 60,
  pending: false,
  onSelectMethod: vi.fn(),
  onStart: vi.fn(),
  onStop: vi.fn(),
  onCollect: vi.fn(),
};

describe("BuildingCard progressbar aria (U15 QA)", () => {
  it("clamps aria-valuenow at 100 when elapsed exceeds duration", () => {
    const running = {
      ...demoFieldIdle,
      status: "running" as const,
      methodId: growWheatDefault.id,
      queue: [{ elapsedGameSec: 7200, durationGameSec: 3600 }],
    };
    render(
      <BuildingCard {...baseProps} building={running} selectedId={growWheatDefault.id} selected={growWheatDefault} />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("reports 100 on ready status", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={{
          ...demoFieldIdle,
          status: "ready",
          methodId: growWheatDefault.id,
          queue: [{ elapsedGameSec: 3600, durationGameSec: 3600 }],
          bufferedOutputs: { item_wheat: 2 },
        }}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("uses 0 when job elapsed is zero", () => {
    const running = {
      ...demoFieldIdle,
      status: "running" as const,
      methodId: growWheatDefault.id,
      queue: [{ elapsedGameSec: 0, durationGameSec: 3600 }],
    };
    render(
      <BuildingCard {...baseProps} building={running} selectedId={growWheatDefault.id} selected={growWheatDefault} />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
