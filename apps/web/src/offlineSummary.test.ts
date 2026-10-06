import { describe, expect, it } from "vitest";
import {
  diffOfflineSnapshot,
  OFFLINE_SNAPSHOT_SCHEMA_VERSION,
  parseStoredSnapshot,
  saveStoredSnapshot,
  snapshotFromGameState,
  summaryFingerprint,
} from "./offlineSummary";
import type { Building, GameState, InvRow, Method } from "./types";

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

describe("offlineSummary storage", () => {
  it("round-trips snapshot through JSON", () => {
    const state = minimalState([fieldBuilding("pb_field", "running")], [inv("item_water", "80")]);
    const snap = snapshotFromGameState(state);
    const raw = JSON.stringify(snap);
    const parsed = parseStoredSnapshot(raw);
    expect(parsed).toEqual(snap);
  });

  it("rejects corrupt JSON and unsupported schema version", () => {
    expect(parseStoredSnapshot("{")).toBeNull();
    expect(parseStoredSnapshot(JSON.stringify({ v: OFFLINE_SNAPSHOT_SCHEMA_VERSION + 99 }))).toBeNull();
  });

  it("saveStoredSnapshot writes readable payload", () => {
    const data: Record<string, string> = {};
    const storage = {
      getItem(k: string) {
        return data[k] ?? null;
      },
      setItem(k: string, v: string) {
        data[k] = v;
      },
    } as unknown as Storage;

    const state = minimalState([fieldBuilding("pb_field", "idle")]);
    saveStoredSnapshot(snapshotFromGameState(state), storage);
    const loaded = parseStoredSnapshot(storage.getItem("ascent.web.offlineSnapshot"));
    expect(loaded?.buildings.pb_field.status).toBe("idle");
  });
});

describe("diffOfflineSnapshot", () => {
  it("returns null when nothing meaningful changed", () => {
    const state = minimalState([fieldBuilding("pb_field", "idle")]);
    const snap = snapshotFromGameState(state);
    expect(diffOfflineSnapshot(snap, state)).toBeNull();
  });

  it("detects running → ready with buffered outputs", () => {
    const before = minimalState([fieldBuilding("pb_field", "running")]);
    const snap = snapshotFromGameState(before);
    const after = minimalState([
      fieldBuilding("pb_field", "ready", { item_wheat: 2, item_straw: 1 }),
    ]);
    const result = diffOfflineSnapshot(snap, after);
    expect(result).not.toBeNull();
    expect(result!.lines).toHaveLength(1);
    expect(result!.lines[0].text).toContain("田");
    expect(result!.lines[0].text).toContain("待收取");
    expect(result!.lines[0].text).toContain("小麥");
    expect(summaryFingerprint(result!.lines)).toBe(result!.fingerprint);
  });

  it("does not treat ready → ready as new completion", () => {
    const buffered = { item_wheat: 2, item_straw: 1 };
    const state = minimalState([fieldBuilding("pb_field", "ready", buffered)]);
    const snap = snapshotFromGameState(state);
    expect(diffOfflineSnapshot(snap, state)).toBeNull();
  });
});
