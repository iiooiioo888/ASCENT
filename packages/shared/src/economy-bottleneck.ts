import { LOW_WATER_QTY, LOW_SEED_QTY } from "./play-loop-config";

export type EconomyBottleneckKind = "water" | "field" | "seed" | "storage";

export type EconomyBottleneckHint = {
  kind: EconomyBottleneckKind;
  label: string;
  hint: string;
};

export type EconomyBottleneckInput = {
  water: number;
  seeds: number;
  fieldCount: number;
  fieldCap: number;
  storageUsed: number;
  storageCap: number;
};

const LABELS: Record<EconomyBottleneckKind, { label: string; hint: string }> = {
  water: { label: "卡水（時間）", hint: "汲水排隊，或用商行買水換時間。" },
  field: { label: "卡田（空間）", hint: "田已達上限；改密集／輪作，或等里程碑加田。" },
  seed: { label: "卡種（資本）", hint: "留種投資代數，或向商行買種（第 0 代）。" },
  storage: { label: "卡倉（物流）", hint: "賣掉或繼續加工，騰出倉格。" },
};

function tightness(used: number, cap: number, invertLow: boolean): number {
  if (cap <= 0) return 0;
  if (invertLow) return 1 - Math.min(1, Math.max(0, used / cap));
  return Math.min(1, Math.max(0, used / cap));
}

/**
 * 三種瓶頸輪流出現：早期水、中期田、後期倉；種子是資本開關。
 * 取當下最緊的一項，讓 HUD 永遠能回答「現在卡在哪」。
 */
export function diagnoseEconomyBottleneck(input: EconomyBottleneckInput): EconomyBottleneckHint {
  const waterT = tightness(input.water, Math.max(LOW_WATER_QTY * 4, 1), true);
  const seedT = tightness(input.seeds, Math.max(LOW_SEED_QTY * 4, 1), true);
  const fieldT =
    input.fieldCap > 0 && input.fieldCount >= input.fieldCap
      ? 1
      : tightness(input.fieldCount, Math.max(input.fieldCap, 1), false);
  const storageT = tightness(input.storageUsed, Math.max(input.storageCap, 1), false);

  const scored: { kind: EconomyBottleneckKind; score: number }[] = [
    { kind: "water", score: waterT + (input.water <= LOW_WATER_QTY ? 0.35 : 0) },
    { kind: "seed", score: seedT + (input.seeds <= LOW_SEED_QTY ? 0.35 : 0) },
    { kind: "field", score: fieldT },
    { kind: "storage", score: storageT + (storageFillRatioRaw(input.storageUsed, input.storageCap) >= 0.8 ? 0.2 : 0) },
  ];
  scored.sort((a, b) => b.score - a.score);
  const kind = scored[0]?.kind ?? "water";
  return { kind, ...LABELS[kind] };
}

function storageFillRatioRaw(used: number, cap: number): number {
  if (cap <= 0) return 0;
  return used / cap;
}
