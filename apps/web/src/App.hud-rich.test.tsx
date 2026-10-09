import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { growWheatDefault } from "./prb-demo/fixtures";
import type { GameState } from "./types";
import { defaultMarketSnapshotForTests, withMarketApiRoute } from "./test/marketFixture";
import { HUD_PRIMARY_CHIP_LIMIT } from "./hud-display";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: apiMock };
});

import App from "./App";

function baseState(): GameState {
  return {
    time: { displayGameTime: 86400, timeScale: 60, serverRealTime: "2026-01-01T12:00:00.000Z" },
    inventory: [
      {
        itemId: "item_copper_ingot",
        quantity: "5",
        item: { code: "item_copper_ingot", layer: "T", derivedTier: 1 },
      },
    ],
    buildings: [
      {
        id: "pb_field",
        status: "idle",
        buildingDefId: "bdef_field",
        buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat"] },
        methodId: null,
        queue: [],
        bufferedOutputs: {},
      },
    ],
    methods: [growWheatDefault],
    buildingDefs: [{ id: "bdef_field", name: "田", code: "field" }],
    workforce: { hired: 2, busy: 1, free: 1, maxHired: 4 },
    opsCosts: {
      hireCostGold: 8,
      laborCostPerStart: 1,
      wageByBuilding: { bdef_field: 1 },
      haulByBuilding: { bdef_field: 0 },
    },
    environment: { weather: "fair", yieldMult: 1 },
  };
}

describe("App FE-RICH-4 HUD", () => {
  beforeEach(() => {
    apiMock.mockReset();
    const state = baseState();
    apiMock.mockImplementation(
      withMarketApiRoute(
        async (path: string) => {
          if (path === "/api/v1/state") return state;
          throw new Error(`unexpected ${path}`);
        },
        () => defaultMarketSnapshotForTests({ gold: 5 }),
      ),
    );
  });

  it("主要 chip ≤5，僅三錠結算、無第二套貨幣 chip", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hud-primary-chips")).toBeInTheDocument());

    const primary = screen.getByTestId("hud-primary-chips");
    const mainChips = primary.querySelectorAll(".chip");
    expect(mainChips.length).toBeLessThanOrEqual(HUD_PRIMARY_CHIP_LIMIT);
    expect(screen.getByTestId("hud-game-clock")).toBeInTheDocument();
    expect(screen.getByTestId("hud-workforce-chip")).toHaveTextContent("👷 2/4·忙1");
    expect(screen.getByTestId("hud-copper-ingot")).toBeInTheDocument();
    expect(primary.textContent).not.toMatch(/🪙/);
    expect(screen.queryByText(/離線最多補算/)).not.toBeInTheDocument();
  });
});
