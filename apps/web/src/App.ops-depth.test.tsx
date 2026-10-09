import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { growWheatDefault } from "./prb-demo/fixtures";
import type { GameState } from "./types";
import { defaultMarketSnapshotForTests, withMarketApiRoute } from "./test/marketFixture";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: apiMock };
});

import App from "./App";

function makeStateWithWorkforce(): GameState {
  return {
    time: { displayGameTime: 0, timeScale: 60, serverRealTime: "2026-01-01T00:00:00.000Z" },
    inventory: [
      {
        itemId: "item_copper_ingot",
        quantity: "100",
        item: { code: "item_copper_ingot", layer: "T", derivedTier: 1 },
      },
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
    workforce: { hired: 1, busy: 0, free: 1, maxHired: 4 },
    opsCosts: {
      hireCostGold: 80,
      laborCostPerStart: 1,
      wageByBuilding: { bdef_field: 10 },
      haulByBuilding: { bdef_field: 0 },
    },
  };
}

describe("App OD-FE-1 workforce HUD", () => {
  beforeEach(() => {
    apiMock.mockReset();
    const state = makeStateWithWorkforce();
    const market = defaultMarketSnapshotForTests({
      gold: 100,
      holdings: { item_copper_ingot: 100, item_seed_wheat: 40, item_water: 80 },
    });
    apiMock.mockImplementation(
      withMarketApiRoute(
        async (path: string, init?: RequestInit) => {
          if (path === "/api/v1/state") return state;
          if (path === "/api/v1/workforce/hire" && init?.method === "POST") {
            return { workforce: { hired: 2, busy: 0, free: 2, maxHired: 4 } };
          }
          throw new Error(`unexpected ${path}`);
        },
        () => market,
      ),
    );
  });

  it("renders workforce chip and posts hire", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(screen.getByTestId("hud-workforce-chip")).toHaveTextContent("👷 1/4·忙0"));

    await user.click(screen.getByRole("button", { name: /僱工/ }));
    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith("/api/v1/workforce/hire", expect.objectContaining({ method: "POST" })),
    );
  });

  it("omits workforce HUD when API omits workforce", async () => {
    const state = makeStateWithWorkforce();
    const { workforce: _w, opsCosts: _o, ...rest } = state;
    const legacy = rest as GameState;
    apiMock.mockImplementation(
      withMarketApiRoute(
        async (path: string) => {
          if (path === "/api/v1/state") return legacy;
          throw new Error(`unexpected ${path}`);
        },
        () => defaultMarketSnapshotForTests({ gold: 10 }),
      ),
    );

    render(<App />);
    await waitFor(() => expect(screen.getByTestId("hud-copper-ingot")).toBeInTheDocument());
    expect(screen.queryByTestId("workforce-hud")).not.toBeInTheDocument();
  });
});
