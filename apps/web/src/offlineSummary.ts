import { fmtBuffered, formatQuantity } from "./format";
import { inventoryQtyMap } from "./inventory";
import { itemLabel } from "./meta";
import type { GameState } from "./types";

/** Bump when snapshot shape changes; older entries are discarded on read. */
export const OFFLINE_SNAPSHOT_SCHEMA_VERSION = 1;

export const OFFLINE_SNAPSHOT_STORAGE_KEY = "ascent.web.offlineSnapshot";

export type OfflineBuildingSnapshot = {
  buildingDefId: string;
  buildingName: string;
  status: string;
  methodId: string | null;
  bufferedOutputs: Record<string, number>;
};

export type OfflineSnapshot = {
  v: number;
  savedAt: string;
  inventory: Record<string, number>;
  buildings: Record<string, OfflineBuildingSnapshot>;
};

export type OfflineSummaryLine = {
  buildingId: string;
  text: string;
};

export type OfflineSummaryResult = {
  lines: OfflineSummaryLine[];
  fingerprint: string;
};

export function snapshotFromGameState(state: GameState): OfflineSnapshot {
  const inventory: Record<string, number> = {};
  for (const row of state.inventory) {
    inventory[row.itemId] = Number(row.quantity);
  }

  const buildings: Record<string, OfflineBuildingSnapshot> = {};
  for (const b of state.buildings) {
    buildings[b.id] = {
      buildingDefId: b.buildingDefId,
      buildingName: b.buildingDef.name,
      status: b.status,
      methodId: b.methodId,
      bufferedOutputs: { ...b.bufferedOutputs },
    };
  }

  return {
    v: OFFLINE_SNAPSHOT_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    inventory,
    buildings,
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBufferedOutputs(raw: unknown): Record<string, number> | null {
  if (!isPlainRecord(raw)) return null;
  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val !== "number" || !Number.isFinite(val)) return null;
    out[key] = val;
  }
  return out;
}

/** Returns null for missing, corrupt, or unsupported schema versions. */
export function parseStoredSnapshot(raw: string | null | undefined): OfflineSnapshot | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainRecord(parsed)) return null;
    if (parsed.v !== OFFLINE_SNAPSHOT_SCHEMA_VERSION) return null;
    if (typeof parsed.savedAt !== "string") return null;
    if (!isPlainRecord(parsed.inventory)) return null;
    if (!isPlainRecord(parsed.buildings)) return null;

    const inventory: Record<string, number> = {};
    for (const [itemId, qty] of Object.entries(parsed.inventory)) {
      if (typeof qty !== "number" || !Number.isFinite(qty)) return null;
      inventory[itemId] = qty;
    }

    const buildings: Record<string, OfflineBuildingSnapshot> = {};
    for (const [id, row] of Object.entries(parsed.buildings)) {
      if (!isPlainRecord(row)) return null;
      if (typeof row.buildingDefId !== "string") return null;
      if (typeof row.buildingName !== "string") return null;
      if (typeof row.status !== "string") return null;
      if (row.methodId !== null && typeof row.methodId !== "string") return null;
      const buffered = parseBufferedOutputs(row.bufferedOutputs);
      if (!buffered) return null;
      buildings[id] = {
        buildingDefId: row.buildingDefId,
        buildingName: row.buildingName,
        status: row.status,
        methodId: row.methodId as string | null,
        bufferedOutputs: buffered,
      };
    }

    return {
      v: OFFLINE_SNAPSHOT_SCHEMA_VERSION,
      savedAt: parsed.savedAt,
      inventory,
      buildings,
    };
  } catch {
    return null;
  }
}

export function loadStoredSnapshot(storage: Storage = localStorage): OfflineSnapshot | null {
  try {
    return parseStoredSnapshot(storage.getItem(OFFLINE_SNAPSHOT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveStoredSnapshot(snapshot: OfflineSnapshot, storage: Storage = localStorage): boolean {
  try {
    storage.setItem(OFFLINE_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function summaryFingerprint(lines: OfflineSummaryLine[]): string {
  return lines.map((l) => `${l.buildingId}:${l.text}`).join("|");
}

/**
 * Compare last-seen snapshot (option A) with settled server state after return.
 * TODO(product): 待確認 — 離線摘要方案 A/B（本函式為方案 A 純前端比對，日後可改 API 摘要）
 */
export function diffOfflineSnapshot(
  previous: OfflineSnapshot,
  current: GameState,
): OfflineSummaryResult | null {
  const lines: OfflineSummaryLine[] = [];

  for (const b of current.buildings) {
    const prev = previous.buildings[b.id];
    if (!prev) continue;

    if (prev.status === "running" && b.status === "ready") {
      const pending = fmtBuffered(b.bufferedOutputs);
      lines.push({
        buildingId: b.id,
        // UX acceptance (U11):「田完成，待收取 🌾×2…」— title「離開期間」由 OfflineSummaryNotice 顯示
        text: `${b.buildingDef.name}完成，待收取 ${pending}`,
      });
    }
  }

  const prevInv = previous.inventory;
  const currInv = inventoryQtyMap(current.inventory);
  const explainedItems = new Set<string>();
  for (const line of lines) {
    const building = current.buildings.find((b) => b.id === line.buildingId);
    if (!building) continue;
    for (const [itemId, qty] of Object.entries(building.bufferedOutputs)) {
      if (qty > 0) explainedItems.add(itemId);
    }
  }

  for (const [itemId, qty] of currInv.entries()) {
    if (explainedItems.has(itemId)) continue;
    const was = prevInv[itemId] ?? 0;
    if (qty > was + 1e-9) {
      const delta = qty - was;
      lines.push({
        buildingId: `inv:${itemId}`,
        text: `背包：+${formatQuantity(delta)} ${itemLabel(itemId)}`,
      });
    }
  }

  if (lines.length === 0) return null;

  return { lines, fingerprint: summaryFingerprint(lines) };
}

export function isOfflineSummaryEnabled(feature: "A" | "off"): feature is "A" {
  return feature === "A";
}
