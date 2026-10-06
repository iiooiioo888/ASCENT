import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { growWheatDefault } from "./prb-demo/fixtures";
import {
  CONNECTION_INTERRUPTED_BANNER,
  CONNECTION_LOAD_FAILED_TITLE,
  CONNECTION_RETRY_BUTTON_LABEL,
} from "./productCopy";
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

describe("App U9/U1 success vs building-action error", () => {
  beforeEach(() => {
    apiMock.mockReset();
    const ready = makeReadyFieldState();
    let collected = false;

    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/state") {
        return collected
          ? {
              ...ready,
              buildings: [{ ...ready.buildings[0], status: "idle", methodId: null, bufferedOutputs: {} }],
            }
          : ready;
      }
      if (path === "/api/v1/buildings/pb_field/collect" && init?.method === "POST") {
        collected = true;
        return { id: "pb_field", status: "idle" };
      }
      if (path === "/api/v1/buildings/pb_field/start" && init?.method === "POST") {
        throw new ApiError("資源不足：item_water", 400);
      }
      throw new Error(`unexpected api call: ${path}`);
    });
  });

  it("clears collect success when a later action maps to a card error", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "收取" }));
    expect(await screen.findByText("+2 小麥 +1 秸稈")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "開工" }));
    expect(await screen.findByText("資源不足：水")).toBeInTheDocument();
    expect(screen.queryByText("+2 小麥 +1 秸稈")).not.toBeInTheDocument();
  });
});

describe("App U10 initial load retry", () => {
  beforeEach(() => {
    apiMock.mockReset();
  });

  it("retries initial load from LoadingScreen", async () => {
    const user = userEvent.setup();
    const ready = makeReadyFieldState();
    let calls = 0;
    apiMock.mockImplementation(async (path: string) => {
      if (path !== "/api/v1/state") throw new Error("unexpected");
      calls += 1;
      if (calls === 1) throw new Error("offline");
      return ready;
    });

    render(<App />);
    expect(await screen.findByText(CONNECTION_LOAD_FAILED_TITLE)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: CONNECTION_RETRY_BUTTON_LABEL }));
    expect(await screen.findByRole("button", { name: "收取" })).toBeInTheDocument();
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
