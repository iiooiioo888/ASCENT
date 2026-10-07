import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEPLETION_CTA_MARKET, DEPLETION_CTA_WELL } from "./productCopy";
import { growWheatDefault } from "./prb-demo/fixtures";
import { WELL_BUILDING_DEF_ID } from "./resource-loop-copy";
import type { GameState } from "./types";
import { MARKET_COPY } from "./marketCopy";
import { defaultMarketSnapshotForTests, withMarketApiRoute } from "./test/marketFixture";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: apiMock };
});

import App from "./App";

function invRow(itemId: string, quantity: string) {
  return {
    itemId,
    quantity,
    item: { code: itemId, layer: "T", derivedTier: 1 },
  };
}

function depletedFieldState(): GameState {
  return {
    time: { displayGameTime: 3600, timeScale: 60, serverRealTime: "2026-01-01T00:00:00.000Z" },
    inventory: [
      invRow("item_seed_wheat", "0"),
      invRow("item_water", "0"),
      invRow("item_gold", "0"),
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
    buildingDefs: [
      { id: "bdef_field", name: "田", code: "field" },
      { id: WELL_BUILDING_DEF_ID, name: "水井", code: "well" },
    ],
  };
}

describe("App v1.1 resource-loop UI (PR #19 @ 8b76068)", () => {
  beforeEach(() => {
    apiMock.mockReset();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("does not render unplaced well plot when well def exists but no well building", async () => {
    const state = depletedFieldState();
    apiMock.mockImplementation(
      withMarketApiRoute(async (path) => {
        if (path === "/api/v1/state") return state;
        throw new Error(`unexpected api call: ${path}`);
      }),
    );

    render(<App />);
    await screen.findByTestId("hud-gold-chip");

    expect(document.getElementById(`plot-unplaced-${WELL_BUILDING_DEF_ID}`)).not.toBeInTheDocument();
  });

  it("well depletion CTA is a no-op without throwing when well is not placed", async () => {
    const user = userEvent.setup();
    const state = depletedFieldState();
    apiMock.mockImplementation(
      withMarketApiRoute(async (path) => {
        if (path === "/api/v1/state") return state;
        throw new Error(`unexpected api call: ${path}`);
      }),
    );

    render(<App />);
    await screen.findByRole("status");
    await user.click(screen.getByRole("button", { name: DEPLETION_CTA_WELL }));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("market depletion CTA switches to buy tab when player can afford a listing", async () => {
    const user = userEvent.setup();
    const state = depletedFieldState();
    const market = defaultMarketSnapshotForTests({
      gold: 3,
      holdings: { item_gold: 3, item_seed_wheat: 0, item_water: 0 },
    });

    apiMock.mockImplementation(
      withMarketApiRoute(
        async (path) => {
          if (path === "/api/v1/state") return state;
          throw new Error(`unexpected api call: ${path}`);
        },
        () => market,
      ),
    );

    render(<App />);
    await screen.findByRole("status");
    expect(screen.getByRole("tab", { name: MARKET_COPY.sellTab })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("button", { name: DEPLETION_CTA_MARKET }));
    expect(screen.getByRole("tab", { name: MARKET_COPY.buyTab })).toHaveAttribute("aria-selected", "true");
  });
});
