import { OPS_DEPTH_COPY } from "./ops-depth-copy";
import type { OpsCostsSnapshot, WorkforceSnapshot } from "./types";

/** 無 API 人手資料時視為人手充足（僅 FE 預檢）。 */
export function effectiveWorkforceFree(workforce?: WorkforceSnapshot | null): number {
  if (!workforce) return Number.POSITIVE_INFINITY;
  if (typeof workforce.free === "number") return workforce.free;
  const hired = workforce.hired ?? 0;
  const busy = workforce.busy ?? 0;
  return Math.max(0, hired - busy);
}

export function laborCostPerStart(opsCosts?: OpsCostsSnapshot | null): number {
  return opsCosts?.laborCostPerStart ?? 0;
}

export function wageForBuilding(opsCosts: OpsCostsSnapshot | null | undefined, buildingDefId: string): number {
  return opsCosts?.wageByBuilding?.[buildingDefId] ?? 0;
}

export function haulForBuilding(opsCosts: OpsCostsSnapshot | null | undefined, buildingDefId: string): number {
  return opsCosts?.haulByBuilding?.[buildingDefId] ?? 0;
}

export function sellTransportPerUnit(
  opsCosts: OpsCostsSnapshot | null | undefined,
  itemId: string,
): number {
  return opsCosts?.sellTransport?.[itemId] ?? 0;
}

export type SellTransportPreview = {
  grossGold: number;
  transportFee: number;
  netGold: number;
  transportTooHigh: boolean;
};

/** 賣出淨收入預覽：缺 `sellTransport` 時運費視為 0（舊 API）。 */
export function sellTransportPreview(
  unitPrice: number,
  quantity: number,
  itemId: string,
  opsCosts?: OpsCostsSnapshot | null,
): SellTransportPreview {
  const unitTransport = sellTransportPerUnit(opsCosts, itemId);
  const grossGold = unitPrice * quantity;
  const transportFee = unitTransport * quantity;
  const netGold = grossGold - transportFee;
  const transportTooHigh = transportFee > grossGold;
  return { grossGold, transportFee, netGold, transportTooHigh };
}

export function startGoldCost(
  opsCosts: OpsCostsSnapshot | null | undefined,
  buildingDefId: string,
): number {
  return wageForBuilding(opsCosts, buildingDefId) + haulForBuilding(opsCosts, buildingDefId);
}

export function hasWorkforceUi(workforce?: WorkforceSnapshot | null, opsCosts?: OpsCostsSnapshot | null): boolean {
  return workforce != null && opsCosts != null;
}

export function canHireWorkforce(
  workforce: WorkforceSnapshot,
  gold: number,
  hireCostGold: number,
): boolean {
  return workforce.hired < workforce.maxHired && gold >= hireCostGold;
}

export type StartOpsPrecheck = {
  labor: number;
  wage: number;
  haul: number;
  goldNeed: number;
  laborOk: boolean;
  goldOk: boolean;
};

export function startOpsPrecheck(
  buildingDefId: string,
  gold: number,
  workforce?: WorkforceSnapshot | null,
  opsCosts?: OpsCostsSnapshot | null,
): StartOpsPrecheck {
  const labor = laborCostPerStart(opsCosts);
  const wage = wageForBuilding(opsCosts, buildingDefId);
  const haul = haulForBuilding(opsCosts, buildingDefId);
  const goldNeed = wage + haul;
  const free = effectiveWorkforceFree(workforce);
  const laborOk = labor <= 0 || free >= labor;
  const goldOk = gold >= goldNeed;
  return { labor, wage, haul, goldNeed, laborOk, goldOk };
}

export function workforceHudLabel(workforce: WorkforceSnapshot): string {
  const free = typeof workforce.free === "number" ? workforce.free : effectiveWorkforceFree(workforce);
  return OPS_DEPTH_COPY.workforceHud(free, workforce.hired);
}
