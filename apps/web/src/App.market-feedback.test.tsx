import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { MARKET_COPY } from "./marketCopy";
import { SUCCESS_FEEDBACK_MS } from "./successFeedback";
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
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("clears market success toast after SUCCESS_FEEDBACK_MS", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);

    const breadRow = await screen.findByTestId("market-row-sell-item_bread");
    await user.click(within(breadRow).getByRole("button", { name: MARKET_COPY.sellCta }));
    expect(await screen.findByTestId("market-success-toast")).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(SUCCESS_FEEDBACK_MS);
    await waitFor(() => {
      expect(screen.queryByTestId("market-success-toast")).not.toBeInTheDocument();
    });
  });

  it("shows panel error without success toast when sell fails", async () => {
    const state = makeState();
    apiMock.mockImplementation(
      withMarketApiRoute(
        async (path: string, init?: RequestInit) => {
          if (path === "/api/v1/state") return state;
          if (path === "/api/v1/market/sell" && init?.method === "POST") {
            throw new ApiError("資源不足：item_bread", 400);
          }
          throw new Error(`unexpected api call: ${path}`);
        },
        () =>
          defaultMarketSnapshotForTests({
            gold: 10,
            holdings: { item_gold: 10, item_bread: 1, item_seed_wheat: 0, item_water: 0 },
          }),
      ),
    );

    const user = userEvent.setup();
    render(<App />);

    const breadRow = await screen.findByTestId("market-row-sell-item_bread");
    await user.click(within(breadRow).getByRole("button", { name: MARKET_COPY.sellCta }));

    expect(await screen.findByRole("alert")).toHaveTextContent("資源不足：麵包");
    expect(screen.queryByTestId("market-success-toast")).not.toBeInTheDocument();
  });
});

describe("App MK-FE-2 depletion → market", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    HTMLElement.prototype.focus = vi.fn();
    apiMock.mockReset();
    const state = makeState({
      inventory: [
        { itemId: "item_gold", quantity: "3", item: { code: "item_gold", layer: "T", derivedTier: 1 } },
        { itemId: "item_bread", quantity: "0", item: { code: "item_bread", layer: "T", derivedTier: 1 } },
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
    });

    apiMock.mockImplementation(
      withMarketApiRoute(
        async (path: string) => {
          if (path === "/api/v1/state") return state;
          throw new Error(`unexpected api call: ${path}`);
        },
        () =>
          defaultMarketSnapshotForTests({
            gold: 3,
            holdings: { item_gold: 3, item_bread: 0, item_seed_wheat: 0, item_water: 0 },
          }),
      ),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("switches market to buy tab when prominent depletion CTA is used", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("hud-gold-chip")).toHaveTextContent("🪙 3");
    });

    const marketCta = await screen.findByRole("button", { name: "前往商行" });
    expect(marketCta).toHaveClass("depletion-cta-market");
    await user.click(marketCta);

    expect(screen.getByRole("tab", { name: MARKET_COPY.buyTab })).toHaveAttribute("aria-selected", "true");
  });
});
