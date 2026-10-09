import type { BuildingStatus } from "./types";

export type BottleneckKind = "input_short" | "output_full" | "throughput_lag";

export type BottleneckHint = {
  kind: BottleneckKind;
  label: string;
};

export type BottleneckBuildingView = {
  id: string;
  buildingDefId: string;
  status: string;
  bufferedOutputs: Record<string, number>;
};

export type BottleneckMethodView = {
  id: string;
  durationGameSec: number;
  inputs: { item_id: string; qty: number }[];
  outputs: { item_id: string; qty: number }[];
};

const OUTPUT_BUFFER_FULL_QTY = 8;

function perGameHour(qty: number, durationGameSec: number): number {
  if (durationGameSec <= 0) return 0;
  return (qty * 3600) / durationGameSec;
}

export function inputShortageHint(
  status: string,
  inputs: { item_id: string; qty: number }[],
  stock: Record<string, number>,
): BottleneckHint | null {
  if (status !== "idle") return null;
  const short = inputs.filter((io) => (stock[io.item_id] ?? 0) + 1e-9 < io.qty);
  if (short.length === 0) return null;
  return { kind: "input_short", label: "原料短缺" };
}

export function outputBufferFullHint(
  status: string,
  buffered: Record<string, number>,
): BottleneckHint | null {
  if (status !== "ready") return null;
  const total = Object.values(buffered).reduce((sum, qty) => sum + qty, 0);
  if (total < OUTPUT_BUFFER_FULL_QTY && status === "ready") {
    return { kind: "output_full", label: "輸出緩衝待收取" };
  }
  if (total >= OUTPUT_BUFFER_FULL_QTY) {
    return { kind: "output_full", label: "輸出緩衝滿" };
  }
  return { kind: "output_full", label: "輸出緩衝待收取" };
}

export function wheatThroughputRates(methods: BottleneckMethodView[]): {
  fieldPerGameHour: number;
  millPerGameHour: number;
} | null {
  const grow = methods.find((m) => m.id === "method_grow_wheat_default");
  const millFlour = methods.find((m) => m.id === "method_mill_flour_default");
  if (!grow || !millFlour) return null;
  const wheatOut = grow.outputs.find((io) => io.item_id === "item_wheat")?.qty ?? 0;
  const wheatIn = millFlour.inputs.find((io) => io.item_id === "item_wheat")?.qty ?? 0;
  return {
    fieldPerGameHour: perGameHour(wheatOut, grow.durationGameSec),
    millPerGameHour: perGameHour(wheatIn, millFlour.durationGameSec),
  };
}

export function wheatThroughputLabel(methods: BottleneckMethodView[]): string | null {
  const rates = wheatThroughputRates(methods);
  if (!rates) return null;
  return `田 ${rates.fieldPerGameHour.toFixed(1)} 麥/時 · 磨 ${rates.millPerGameHour.toFixed(1)} 麥/時`;
}

/** 磨坊處理小麥的速率慢於田產出時，標成節拍堵塞。 */
export function millLagHint(
  buildings: BottleneckBuildingView[],
  methods: BottleneckMethodView[],
): BottleneckHint | null {
  const field = buildings.find((b) => b.buildingDefId === "bdef_field");
  const mill = buildings.find((b) => b.buildingDefId === "bdef_mill");
  if (!field || !mill) return null;
  if (field.status !== "running" && mill.status !== "running") return null;
  const rates = wheatThroughputRates(methods);
  if (!rates) return null;
  if (rates.millPerGameHour + 1e-9 < rates.fieldPerGameHour) {
    return { kind: "throughput_lag", label: "磨坊慢於田" };
  }
  return null;
}

export function buildingBottleneck(
  building: BottleneckBuildingView,
  selected: BottleneckMethodView | undefined,
  stock: Record<string, number>,
  allBuildings: BottleneckBuildingView[],
  methods: BottleneckMethodView[],
): BottleneckHint | null {
  if (selected) {
    const shortage = inputShortageHint(building.status, selected.inputs, stock);
    if (shortage) return shortage;
  }
  const buffered = outputBufferFullHint(building.status as BuildingStatus, building.bufferedOutputs);
  if (buffered) return buffered;
  if (building.buildingDefId === "bdef_mill" || building.buildingDefId === "bdef_field") {
    return millLagHint(allBuildings, methods);
  }
  return null;
}
