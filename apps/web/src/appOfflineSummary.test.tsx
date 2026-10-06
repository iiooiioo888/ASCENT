import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  OFFLINE_SNAPSHOT_STORAGE_KEY,
  parseStoredSnapshot,
  saveStoredSnapshot,
  snapshotFromGameState,
} from "./offlineSummary";
import type { Building, GameState, InvRow, Method } from "./types";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("./api", () => ({
  api: apiMock,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const growWheat: Method = {
  id: "method_grow_wheat_default",
  code: "grow_wheat_default",
  ruleId: "rule_grow_wheat",
  durationGameSec: 3600,
  inputs: [],
  outputs: [],
};

function inv(itemId: string, quantity: string): InvRow {
  return {
    itemId,
    quantity,
    item: { code: itemId, layer: "T", derivedTier: 0 },
  };
}

function fieldBuilding(id: string, status: Building["status"], buffered: Record<string, number> = {}): Building {
  return {
    id,
    status,
    buildingDefId: "bdef_field",
    buildingDef: { name: "田", allowedRuleIds: ["rule_grow_wheat"] },
    methodId: status === "idle" ? null : growWheat.id,
    queue: status === "running" ? [{ elapsedGameSec: 100, durationGameSec: 3600 }] : [],
    bufferedOutputs: buffered,
  };
}

function gameState(buildings: Building[], inventory: InvRow[] = [inv("item_water", "80")]): GameState {
  return {
    time: { displayGameTime: 0, timeScale: 60, serverRealTime: new Date().toISOString() },
    inventory,
    buildings,
    methods: [growWheat],
    buildingDefs: [{ id: "bdef_field", name: "田", code: "field" }],
  };
}

async function importApp() {
  const mod = await import("./App");
  return mod.default;
}

describe("App offline summary (PR-E U11)", () => {
  beforeEach(() => {
    apiMock.mockReset();
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows summary only after GET /state succeeds, not on initial load failure", async () => {
    const runningSnap = snapshotFromGameState(gameState([fieldBuilding("pb_field", "running")]));
    saveStoredSnapshot(runningSnap);

    const ready = gameState([fieldBuilding("pb_field", "ready", { item_wheat: 2, item_straw: 1 })]);
    apiMock.mockImplementation(() => Promise.reject(new Error("network down")));

    const App = await importApp();
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "重試" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    apiMock.mockImplementation(() => Promise.resolve(ready));
    await userEvent.click(screen.getByRole("button", { name: "重試" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeVisible();
      expect(screen.getByText(/田完成，待收取/)).toBeInTheDocument();
    });
  });

  it("acknowledging updates snapshot and suppresses repeat on remount", async () => {
    saveStoredSnapshot(snapshotFromGameState(gameState([fieldBuilding("pb_field", "running")])));
    const ready = gameState([fieldBuilding("pb_field", "ready", { item_wheat: 2, item_straw: 1 })]);
    apiMock.mockResolvedValue(ready);

    const App = await importApp();
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeVisible());

    await user.click(screen.getByRole("button", { name: "知道了" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const stored = parseStoredSnapshot(localStorage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY));
    expect(stored?.buildings.pb_field.status).toBe("ready");

    unmount();
    vi.resetModules();
    const App2 = await importApp();
    render(<App2 />);
    await waitFor(() => expect(screen.getByText("田")).toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("remount before acknowledging still shows summary", async () => {
    saveStoredSnapshot(snapshotFromGameState(gameState([fieldBuilding("pb_field", "running")])));
    const ready = gameState([fieldBuilding("pb_field", "ready", { item_wheat: 2, item_straw: 1 })]);
    apiMock.mockResolvedValue(ready);

    const App = await importApp();
    const { unmount } = render(<App />);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeVisible());
    unmount();

    vi.resetModules();
    const App2 = await importApp();
    render(<App2 />);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeVisible());
  });

  it("does not overwrite snapshot on pagehide while summary is unacknowledged", async () => {
    saveStoredSnapshot(snapshotFromGameState(gameState([fieldBuilding("pb_field", "running")])));
    const ready = gameState([fieldBuilding("pb_field", "ready", { item_wheat: 2, item_straw: 1 })]);
    apiMock.mockResolvedValue(ready);

    const App = await importApp();
    render(<App />);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeVisible());

    const beforeHide = parseStoredSnapshot(localStorage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY));
    expect(beforeHide?.buildings.pb_field.status).toBe("running");

    window.dispatchEvent(new Event("pagehide"));
    const afterHide = parseStoredSnapshot(localStorage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY));
    expect(afterHide?.buildings.pb_field.status).toBe("running");
  });

  it("persists snapshot on visibilitychange(hidden) when no summary is open", async () => {
    const idle = gameState([fieldBuilding("pb_field", "idle")]);
    apiMock.mockResolvedValue(idle);

    const App = await importApp();
    render(<App />);
    await waitFor(() => expect(screen.getByText("田")).toBeInTheDocument());
    expect(localStorage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY)).toBeTruthy();

    localStorage.removeItem(OFFLINE_SNAPSHOT_STORAGE_KEY);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });

    const stored = parseStoredSnapshot(localStorage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY));
    expect(stored?.buildings.pb_field.status).toBe("idle");
  });

  it("persists snapshot on pagehide when no summary is open", async () => {
    const idle = gameState([fieldBuilding("pb_field", "idle")]);
    apiMock.mockResolvedValue(idle);

    const App = await importApp();
    render(<App />);
    await waitFor(() => expect(screen.getByText("田")).toBeInTheDocument());

    localStorage.removeItem(OFFLINE_SNAPSHOT_STORAGE_KEY);
    window.dispatchEvent(new Event("pagehide"));
    expect(parseStoredSnapshot(localStorage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY))?.buildings.pb_field.status).toBe(
      "idle",
    );
  });
});

describe("FEATURE_OFFLINE_SUMMARY off", () => {
  beforeEach(() => {
    apiMock.mockReset();
    localStorage.clear();
    vi.resetModules();
  });

  it("skips writing and showing when flag is off", async () => {
    vi.doMock("./productCopy", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./productCopy")>();
      return { ...actual, FEATURE_OFFLINE_SUMMARY: "off" as const };
    });

    saveStoredSnapshot(snapshotFromGameState(gameState([fieldBuilding("pb_field", "running")])));
    apiMock.mockResolvedValue(
      gameState([fieldBuilding("pb_field", "ready", { item_wheat: 2, item_straw: 1 })]),
    );

    const App = await importApp();
    render(<App />);
    await waitFor(() => expect(screen.getByText("田")).toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY)).toBeTruthy();
    const stored = parseStoredSnapshot(localStorage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY));
    expect(stored?.buildings.pb_field.status).toBe("running");
  });
});
