import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MARKET_COPY } from "./marketCopy";
import { TRADING_POST_BUILDING_DEF_ID } from "./tradingPost";
import { defaultMarketSnapshotForTests, withMarketApiRoute } from "./test/marketFixture";
import type { GameState } from "./types";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: apiMock };
});

import App from "./App";
import { growWheatDefault } from "./prb-demo/fixtures";

function makeState(overrides?: Partial<GameState>): GameState {
  return {
    time: { displayGameTime: 3600, timeScale: 60, serverRealTime: "2026-01-01T00:00:00.000Z" },
    inventory: [
      { itemId: "item_copper_ingot", quantity: "10", item: { code: "item_copper_ingot", layer: "T", derivedTier: 1 } },
      { itemId: "item_bread", quantity: "1", item: { code: "item_bread", layer: "T", derivedTier: 1 } },
      { itemId: "item_seed_wheat", quantity: "0", item: { code: "item_seed_wheat", layer: "T", derivedTier: 1 } },
      { itemId: "item_water", quantity: "0", item: { code: "item_water", layer: "T", derivedTier: 1 } },
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
      {
        id: "pb_trading_post",
        status: "idle",
        buildingDefId: TRADING_POST_BUILDING_DEF_ID,
        buildingDef: { name: "莊外商行", allowedRuleIds: [] },
        methodId: null,
        queue: [],
        bufferedOutputs: {},
      },
    ],
    methods: [growWheatDefault],
    buildingDefs: [{ id: "bdef_field", name: "田", code: "field" }],
    ...overrides,
  };
}

describe("App MK-FE-2 market feedback", () => {
  beforeEach(() => {
    apiMock.mockReset();
    const state = makeState();
    let market = defaultMarketSnapshotForTests({
      gold: 10,
      holdings: { item_copper_ingot: 10, item_bread: 1, item_seed_wheat: 0, item_water: 0 },
    });

    apiMock.mockImplementation(
      withMarketApiRoute(
        async (path: string, init?: RequestInit) => {
          if (path === "/api/v1/state") return state;
          if (path === "/api/v1/market/sell" && init?.method === "POST") {
            market = {
              ...market,
              gold: 17,
              holdings: { ...market.holdings, item_bread: 0, item_copper_ingot: 17 },
            };
            return { goldDelta: 7, netGoldDelta: 7, transportFee: 1 };
          }
          throw new Error(`unexpected api call: ${path}`);
        },
        () => market,
      ),
    );
  });

  it("shows HUD copper ingot chip and sell success toast", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByTestId("hud-copper-ingot")).toHaveTextContent("🟠 10");

    await user.click(await screen.findByRole("button", { name: MARKET_COPY.tradeCta }));

    const breadRow = await screen.findByTestId("market-row-sell-item_bread");
    await user.click(within(breadRow).getByRole("button", { name: MARKET_COPY.sellCta }));

    expect(await screen.findByTestId("market-success-toast")).toHaveTextContent("已售出 麵包×1，實收 🟠7（運費 🟠1）");
    await waitFor(() => {
      expect(screen.getByTestId("hud-copper-ingot")).toHaveTextContent("🟠 17");
    });
  });
});
