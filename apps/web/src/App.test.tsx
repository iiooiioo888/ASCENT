import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUILDING_STATE_CHANGED_COPY } from "./format";
import { growWheatDefault } from "./prb-demo/fixtures";
import { CONNECTION_INTERRUPTED_BANNER } from "./productCopy";
import type { GameState } from "./types";

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

function makeReadyFieldState(): GameState {
  return {
    time: { displayGameTime: 3600, timeScale: 60, serverRealTime: "2026-01-01T00:00:00.000Z" },
    inventory: [
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
        status: "ready",
        buildingDefId: "bdef_field",
        buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat"] },
        methodId: growWheatDefault.id,
        queue: [],
        bufferedOutputs: { item_wheat: 2, item_straw: 1 },
      },
    ],
    methods: [growWheatDefault],
    buildingDefs: [{ id: "bdef_field", name: "田", code: "field" }],
  };
}

describe("App U9 collect success feedback", () => {
  beforeEach(() => {
    apiMock.mockReset();
    const ready = makeReadyFieldState();
    const afterCollect: GameState = {
      ...ready,
      buildings: [
        {
          ...ready.buildings[0],
          status: "idle",
          methodId: null,
          bufferedOutputs: {},
        },
      ],
      inventory: ready.inventory.map((row) => {
        if (row.itemId === "item_wheat") return { ...row, quantity: "2" };
        if (row.itemId === "item_straw") return { ...row, quantity: "1" };
        return row;
      }),
    };

    let collected = false;
    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/state") {
        return collected ? afterCollect : ready;
      }
      if (path === "/api/v1/buildings/pb_field/collect" && init?.method === "POST") {
        collected = true;
        return { id: "pb_field", status: "idle" };
      }
      throw new Error(`unexpected api call: ${path}`);
    });
  });

  it("shows collect success on card and highlights inventory", async () => {
    const user = userEvent.setup();
    render(<App />);

    const collectBtn = await screen.findByRole("button", { name: "收取" });
    await user.click(collectBtn);

    expect(await screen.findByText("+2 小麥 +1 秸稈")).toBeInTheDocument();
    const wheatCell = screen.getByText("小麥").closest(".item");
    const strawCell = screen.getByText("秸稈").closest(".item");
    expect(wheatCell).toHaveClass("highlight");
    expect(strawCell).toHaveClass("highlight");
  });
});

describe("App U10 connection status", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows connection bar after three failed polls", async () => {
    const ready = makeReadyFieldState();
    let stateCalls = 0;
    apiMock.mockImplementation(async (path: string) => {
      if (path !== "/api/v1/state") throw new Error("unexpected");
      stateCalls += 1;
      if (stateCalls === 1) return ready;
      throw new Error("offline");
    });

    render(<App />);
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "收取" })).toBeInTheDocument();
    });

    await vi.advanceTimersByTimeAsync(6000);

    await vi.waitFor(() => {
      expect(screen.getByText(CONNECTION_INTERRUPTED_BANNER)).toBeInTheDocument();
    });
  });
});

describe("App P0 stale building action refresh", () => {
  beforeEach(() => {
    apiMock.mockReset();
  });

  it("refreshes state after HTTP 409 on collect", async () => {
    const user = userEvent.setup();
    const ready = makeReadyFieldState();
    let stateFetches = 0;

    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/state") {
        stateFetches += 1;
        return ready;
      }
      if (path === "/api/v1/buildings/pb_field/collect" && init?.method === "POST") {
        const { ApiError } = await import("./api");
        throw new ApiError("建築狀態已變更，請重新整理", 409);
      }
      throw new Error(`unexpected api call: ${path}`);
    });

    render(<App />);
    const collectBtn = await screen.findByRole("button", { name: "收取" });
    const beforeCollect = stateFetches;
    await user.click(collectBtn);

    await waitFor(() => {
      expect(stateFetches).toBeGreaterThan(beforeCollect);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(BUILDING_STATE_CHANGED_COPY);
  });

  it("refreshes state after pre-PR#8 HTTP 400 race on collect", async () => {
    const user = userEvent.setup();
    const ready = makeReadyFieldState();
    let stateFetches = 0;

    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/state") {
        stateFetches += 1;
        return ready;
      }
      if (path === "/api/v1/buildings/pb_field/collect" && init?.method === "POST") {
        const { ApiError } = await import("./api");
        throw new ApiError("尚無可收取產出", 400);
      }
      throw new Error(`unexpected api call: ${path}`);
    });

    render(<App />);
    const collectBtn = await screen.findByRole("button", { name: "收取" });
    const beforeCollect = stateFetches;
    await user.click(collectBtn);

    await waitFor(() => {
      expect(stateFetches).toBeGreaterThan(beforeCollect);
    });
    expect(screen.getByRole("alert")).toHaveTextContent(BUILDING_STATE_CHANGED_COPY);
  });
});
