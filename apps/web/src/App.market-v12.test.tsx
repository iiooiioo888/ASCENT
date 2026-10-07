import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { growWheatDefault } from "./prb-demo/fixtures";
import { MARKET_COPY } from "./marketCopy";
import type { Building, GameState } from "./types";
import { defaultMarketSnapshotForTests, withMarketApiRoute } from "./test/marketFixture";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    api: apiMock,
  };
});

import App from "./App";

function invRow(itemId: string, quantity: string) {
  return {
    itemId,
    quantity,
    item: { code: itemId, layer: "T", derivedTier: 1 },
  };
}

const tradingPostBuilding: Building = {
  id: "pb_trading_post",
  status: "idle",
  buildingDefId: "bdef_trading_post",
  buildingDef: { name: "莊外商行", allowedRuleIds: [] },
  methodId: null,
  queue: [],
  bufferedOutputs: {},
};

function makeSettlementWithTradingPost(): GameState {
  return {
    time: { displayGameTime: 3600, timeScale: 60, serverRealTime: "2026-01-01T00:00:00.000Z" },
    inventory: [
      invRow("item_gold", "10"),
      invRow("item_seed_wheat", "40"),
      invRow("item_water", "80"),
      invRow("item_wheat", "0"),
      invRow("item_straw", "0"),
      invRow("item_flour", "0"),
      invRow("item_feed", "0"),
      invRow("item_dough", "0"),
      invRow("item_bread", "0"),
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
      tradingPostBuilding,
    ],
    methods: [growWheatDefault],
    buildingDefs: [
      { id: "bdef_field", name: "田", code: "field" },
      { id: "bdef_silo", name: "倉", code: "silo" },
      { id: "bdef_mill", name: "磨坊", code: "mill" },
      { id: "bdef_oven", name: "爐", code: "oven" },
      { id: "bdef_trading_post", name: "莊外商行", code: "trading_post" },
    ],
  };
}

describe("App market v1.2 (trading post building)", () => {
  beforeEach(() => {
    apiMock.mockReset();
    const game = makeSettlementWithTradingPost();
    apiMock.mockImplementation(
      withMarketApiRoute(async (path: string) => {
        if (path === "/api/v1/state") return game;
        throw new Error(`unexpected api call: ${path}`);
      }),
    );
  });

  it("does not render a standalone market panel when collapsed", async () => {
    render(<App />);
    await screen.findByRole("button", { name: MARKET_COPY.tradeCta });
    expect(document.getElementById("market-panel")).toBeNull();
    expect(screen.queryByRole("tab", { name: MARKET_COPY.sellTab })).not.toBeInTheDocument();
  });

  it("never offers trading post on empty plot placement list", async () => {
    render(<App />);
    await screen.findByRole("button", { name: MARKET_COPY.tradeCta });
    expect(screen.queryByText(/可放置莊外商行/)).not.toBeInTheDocument();
    expect(screen.getByText(/可放置倉/)).toBeInTheDocument();
  });

  it("renders a single market panel when expanded", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: MARKET_COPY.tradeCta }));
    const panels = document.querySelectorAll("#market-panel");
    expect(panels).toHaveLength(1);
    expect(document.getElementById(`building-${tradingPostBuilding.id}`)).toBeInTheDocument();
  });
});

describe("App market T7 — state poll must not clear panel error or collapse panel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it(
    "keeps market error and expanded panel across GET /state polls",
    async () => {
    const game = makeSettlementWithTradingPost();
    const market = defaultMarketSnapshotForTests({
      gold: 10,
      holdings: {
        item_gold: 10,
        item_bread: 1,
        item_seed_wheat: 40,
        item_water: 80,
      },
    });

    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/state") return game;
      if (path === "/api/v1/market") return market;
      if (path === "/api/v1/market/sell" && init?.method === "POST") {
        const { ApiError } = await import("./api");
        throw new ApiError("結算鎖衝突", 409);
      }
      throw new Error(`unexpected api call: ${path}`);
    });

    render(<App />);
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: MARKET_COPY.tradeCta })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: MARKET_COPY.tradeCta }));
    expect(document.getElementById("market-panel")).toBeInTheDocument();

    const breadRow = screen.getByTestId("market-row-sell-item_bread");
    fireEvent.click(within(breadRow).getByRole("button", { name: MARKET_COPY.sellCta }));

    await vi.waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(MARKET_COPY.settlementConflict);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4500);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(MARKET_COPY.settlementConflict);
    expect(document.getElementById("market-panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: MARKET_COPY.closeTradeCta })).toHaveAttribute("aria-expanded", "true");
    },
    15_000,
  );
});
