import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MARKET_POLL_INTERVAL_MS, STATE_POLL_INTERVAL_MS } from "./gamePoll";
import { growWheatDefault } from "./prb-demo/fixtures";
import type { GameState } from "./types";
import { ApiError } from "./api";
import { defaultMarketSnapshotForTests, withMarketApiRoute } from "./test/marketFixture";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return { ...actual, api: apiMock };
});

import App from "./App";

function makeState(): GameState {
  return {
    time: { displayGameTime: 3600, timeScale: 60, serverRealTime: "2026-01-01T00:00:00.000Z" },
    inventory: [],
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
  };
}

describe("App polling (storm guard)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not cascade extra /state calls between poll ticks", async () => {
    let stateCalls = 0;
    apiMock.mockImplementation(
      withMarketApiRoute(async (path: string) => {
        if (path === "/api/v1/market/commodities") throw new ApiError("missing", 404);
        if (path === "/api/v1/state") {
          stateCalls += 1;
          return makeState();
        }
        throw new Error(`unexpected: ${path}`);
      }),
    );

    render(<App />);
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { name: "田" })).toBeInTheDocument();
    });
    const afterLoad = stateCalls;
    expect(afterLoad).toBeGreaterThanOrEqual(1);

    await vi.advanceTimersByTimeAsync(STATE_POLL_INTERVAL_MS);
    const afterOneTick = stateCalls;
    expect(afterOneTick - afterLoad).toBeLessThanOrEqual(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(stateCalls).toBe(afterOneTick);
  });

  it("refreshes market on slower interval than state", async () => {
    let marketCalls = 0;
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/market/commodities") throw new ApiError("missing", 404);
      if (path === "/api/v1/state") return makeState();
      if (path === "/api/v1/market") {
        marketCalls += 1;
        return defaultMarketSnapshotForTests();
      }
      throw new Error(`unexpected: ${path}`);
    });

    render(<App />);
    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { name: "田" })).toBeInTheDocument();
    });
    const afterLoad = marketCalls;

    await vi.advanceTimersByTimeAsync(STATE_POLL_INTERVAL_MS * 2);
    expect(marketCalls).toBe(afterLoad);

    await vi.advanceTimersByTimeAsync(MARKET_POLL_INTERVAL_MS);
    await vi.waitFor(() => {
      expect(marketCalls).toBeGreaterThan(afterLoad);
    });
  });
});
