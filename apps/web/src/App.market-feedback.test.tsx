import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MARKET_COPY } from "./marketCopy";
import { defaultMarketSnapshotForTests, withMarketApiRoute } from "./test/marketFixture";
import type { GameState } from "./types";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: apiMock };
});

import App from "./App";
import { growWheatDefault } from "./prb-demo/fixtures";

/** TODO(BE): shared STARTING_GOLD 應為 10（#16 現仍 0）；測試 mock 金幣 10 作 v1.1 佔位期望。 */
function makeState(overrides?: Partial<GameState>): GameState {
  return {
    time: { displayGameTime: 3600, timeScale: 60, serverRealTime: "2026-01-01T00:00:00.000Z" },
    inventory: [
      { itemId: "item_gold", quantity: "10", item: { code: "item_gold", layer: "T", derivedTier: 1 } },
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
      holdings: { item_gold: 10, item_bread: 1, item_seed_wheat: 0, item_water: 0 },
    });

    apiMock.mockImplementation(
      withMarketApiRoute(
        async (path: string, init?: RequestInit) => {
          if (path === "/api/v1/state") return state;
          if (path === "/api/v1/market/sell" && init?.method === "POST") {
            market = {
              ...market,
              gold: 18,
              holdings: { ...market.holdings, item_bread: 0, item_gold: 18 },
            };
            return {};
          }
          throw new Error(`unexpected api call: ${path}`);
        },
        () => market,
      ),
    );
  });

  it("shows HUD gold chip and sell success toast", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByTestId("hud-gold-chip")).toHaveTextContent("🪙 10");

    const breadRow = await screen.findByTestId("market-row-sell-item_bread");
    await user.click(within(breadRow).getByRole("button", { name: MARKET_COPY.sellCta }));

    expect(await screen.findByTestId("market-success-toast")).toHaveTextContent("已售出 麵包×1，＋🪙8");
    await waitFor(() => {
      expect(screen.getByTestId("hud-gold-chip")).toHaveTextContent("🪙 18");
    });
  });
});
