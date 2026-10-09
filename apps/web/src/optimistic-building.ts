import type { Building, GameState, Method } from "./types";

function qtyMap(state: GameState): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of state.inventory) {
    map[row.itemId] = Number(row.quantity);
  }
  return map;
}

function withQty(state: GameState, next: Record<string, number>): GameState {
  const inventory = state.inventory.map((row) => {
    if (!(row.itemId in next)) return row;
    return { ...row, quantity: String(next[row.itemId] ?? 0) };
  });
  for (const [itemId, quantity] of Object.entries(next)) {
    if (inventory.some((row) => row.itemId === itemId)) continue;
    inventory.push({
      itemId,
      quantity: String(quantity),
      item: { code: itemId, layer: "T", derivedTier: 1 },
    });
  }
  return { ...state, inventory };
}

function patchBuilding(state: GameState, buildingId: string, patch: Partial<Building>): GameState {
  return {
    ...state,
    buildings: state.buildings.map((b) => (b.id === buildingId ? { ...b, ...patch } : b)),
  };
}

export function applyOptimisticStart(
  state: GameState,
  buildingId: string,
  method: Method,
  goldCost: number,
): GameState {
  const stock = qtyMap(state);
  for (const io of method.inputs) {
    stock[io.item_id] = Math.max(0, (stock[io.item_id] ?? 0) - io.qty);
  }
  if (goldCost > 0) {
    stock.item_copper_ingot = Math.max(0, (stock.item_copper_ingot ?? 0) - goldCost);
  }
  const outputs: Record<string, number> = {};
  for (const io of method.outputs) outputs[io.item_id] = io.qty;
  return patchBuilding(withQty(state, stock), buildingId, {
    status: "running",
    methodId: method.id,
    queue: [{ elapsedGameSec: 0, durationGameSec: method.durationGameSec }],
    bufferedOutputs: {},
  });
}

export function applyOptimisticStop(state: GameState, buildingId: string): GameState {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building) return state;
  const nextStatus = building.status === "ready" ? "ready" : "idle";
  return patchBuilding(state, buildingId, {
    status: nextStatus,
    methodId: nextStatus === "ready" ? building.methodId : null,
    queue: nextStatus === "ready" ? building.queue : [],
  });
}

export function applyOptimisticCollect(state: GameState, buildingId: string): GameState {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building) return state;
  const stock = qtyMap(state);
  for (const [itemId, qty] of Object.entries(building.bufferedOutputs ?? {})) {
    stock[itemId] = (stock[itemId] ?? 0) + qty;
  }
  return patchBuilding(withQty(state, stock), buildingId, {
    status: "idle",
    methodId: null,
    queue: [],
    bufferedOutputs: {},
  });
}
