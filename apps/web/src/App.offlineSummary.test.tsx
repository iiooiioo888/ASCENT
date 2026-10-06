import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import {
  OFFLINE_SNAPSHOT_STORAGE_KEY,
  parseStoredSnapshot,
  saveStoredSnapshot,
  snapshotFromGameState,
} from "./offlineSummary";
import { OFFLINE_SUMMARY_DISMISS_LABEL, OFFLINE_SUMMARY_TITLE } from "./productCopy";
import type { Building, GameState, InvRow, Method } from "./types";

vi.mock("./api", () => ({
  api: vi.fn(),
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

function minimalState(buildings: Building[], inventory: InvRow[] = []): GameState {
  return {
    time: { displayGameTime: 0, timeScale: 60, serverRealTime: new Date().toISOString() },
    inventory,
    buildings,
    methods: [growWheat],
    buildingDefs: [{ id: "bdef_field", name: "田", code: "field" }],
  };
}

describe("App U11 offline summary (plan A)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api).mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("shows summary after GET /state when stored snapshot had running → ready", async () => {
    const before = minimalState([fieldBuilding("pb_field", "running")]);
    saveStoredSnapshot(snapshotFromGameState(before));
    const after = minimalState([fieldBuilding("pb_field", "ready", { item_wheat: 2, item_straw: 1 })]);
    vi.mocked(api).mockResolvedValue(after);

    const { default: App } = await import("./App");
    render(<App />);

    const dialog = await screen.findByRole("dialog", { name: OFFLINE_SUMMARY_TITLE });
    expect(dialog).toHaveTextContent("田：已完成，待收取");
  });

  it("dismiss persists current state so the same completion batch does not reappear", async () => {
    const before = minimalState([fieldBuilding("pb_field", "running")]);
    saveStoredSnapshot(snapshotFromGameState(before));
    const after = minimalState([fieldBuilding("pb_field", "ready", { item_wheat: 2, item_straw: 1 })]);
    vi.mocked(api).mockResolvedValue(after);

    const { default: App } = await import("./App");
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: OFFLINE_SUMMARY_DISMISS_LABEL }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    const stored = parseStoredSnapshot(localStorage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY));
    expect(stored?.buildings.pb_field.status).toBe("ready");

    unmount();
    vi.resetModules();
    const { default: AppAgain } = await import("./App");
    render(<AppAgain />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "崛起" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not show summary when FEATURE_OFFLINE_SUMMARY is off", async () => {
    vi.resetModules();
    vi.doMock("./productCopy", async () => {
      const actual = await vi.importActual<typeof import("./productCopy")>("./productCopy");
      return {
        ...actual,
        FEATURE_OFFLINE_SUMMARY: "off" as const,
      };
    });

    const before = minimalState([fieldBuilding("pb_field", "running")]);
    saveStoredSnapshot(snapshotFromGameState(before));
    const after = minimalState([fieldBuilding("pb_field", "ready", { item_wheat: 2, item_straw: 1 })]);
    vi.mocked(api).mockResolvedValue(after);

    const { default: App } = await import("./App");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "崛起" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    vi.doUnmock("./productCopy");
    vi.resetModules();
  });
});
