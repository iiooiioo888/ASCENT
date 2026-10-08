/** R1 LOCKED：經營深度（工位池＋工資／運費 config）；數值見 UX §0.3。 */
export type OpsDepthConfig = {
  workforce: {
    startingHired: number;
    maxHired: number;
    hireCostGold: number;
    laborCostPerStart: number;
  };
  wages: { byBuildingId: Record<string, number> };
  haul: { byBuildingId: Record<string, number> };
  sellTransport: Record<string, number>;
};

export type OpsCostsSnapshot = {
  hireCostGold: number;
  wageByBuilding: Record<string, number>;
  haulByBuilding: Record<string, number>;
  sellTransport: Record<string, number>;
  laborCostPerStart: number;
};

export const DEFAULT_OPS_DEPTH: OpsDepthConfig = {
  workforce: {
    startingHired: 1,
    maxHired: 8,
    hireCostGold: 8,
    laborCostPerStart: 1,
  },
  wages: {
    byBuildingId: {
      bdef_field: 1,
      bdef_well: 1,
      bdef_mill: 2,
      bdef_oven: 2,
      bdef_trading_post: 0,
      bdef_ranch: 2,
      bdef_mine: 1,
      bdef_quarry: 1,
      bdef_forest: 1,
      bdef_boiler: 1,
      bdef_smelter: 2,
      bdef_kiln: 2,
      bdef_chem_works: 2,
      bdef_workshop: 2,
      bdef_machine_shop: 3,
    },
  },
  haul: {
    byBuildingId: {
      bdef_field: 0,
      bdef_well: 0,
      bdef_mill: 1,
      bdef_oven: 2,
      bdef_ranch: 0,
      bdef_mine: 0,
      bdef_quarry: 0,
      bdef_forest: 0,
      bdef_boiler: 1,
      bdef_smelter: 1,
      bdef_kiln: 1,
      bdef_chem_works: 1,
      bdef_workshop: 1,
      bdef_machine_shop: 2,
    },
  },
  sellTransport: {
    item_bread: 1,
  },
};

function isNonNegativeInt(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && Number.isInteger(n) && n >= 0;
}

function mergeNonNegativeIntMap(
  base: Record<string, number>,
  patch: Record<string, unknown> | undefined,
): Record<string, number> {
  const out = { ...base };
  if (!patch || typeof patch !== "object") return out;
  for (const [key, value] of Object.entries(patch)) {
    if (isNonNegativeInt(value)) out[key] = value;
  }
  return out;
}

/** 合併 DB JSON 與預設；非法負數忽略。 */
export function opsDepthFromDb(raw: unknown): OpsDepthConfig {
  const base = DEFAULT_OPS_DEPTH;
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as {
    workforce?: Record<string, unknown>;
    wages?: { byBuildingId?: Record<string, unknown> };
    haul?: { byBuildingId?: Record<string, unknown> };
    sellTransport?: Record<string, unknown>;
  };

  const wf = obj.workforce ?? {};
  const workforce = {
    startingHired: isNonNegativeInt(wf.startingHired) ? wf.startingHired : base.workforce.startingHired,
    maxHired: isNonNegativeInt(wf.maxHired) ? wf.maxHired : base.workforce.maxHired,
    hireCostGold: isNonNegativeInt(wf.hireCostGold) ? wf.hireCostGold : base.workforce.hireCostGold,
    laborCostPerStart: isNonNegativeInt(wf.laborCostPerStart)
      ? wf.laborCostPerStart
      : base.workforce.laborCostPerStart,
  };

  return {
    workforce,
    wages: {
      byBuildingId: mergeNonNegativeIntMap(base.wages.byBuildingId, obj.wages?.byBuildingId),
    },
    haul: {
      byBuildingId: mergeNonNegativeIntMap(base.haul.byBuildingId, obj.haul?.byBuildingId),
    },
    sellTransport: mergeNonNegativeIntMap(base.sellTransport, obj.sellTransport),
  };
}

export function wageGoldForBuilding(buildingDefId: string, depth: OpsDepthConfig = DEFAULT_OPS_DEPTH): number {
  return depth.wages.byBuildingId[buildingDefId] ?? 0;
}

export function haulGoldForBuilding(buildingDefId: string, depth: OpsDepthConfig = DEFAULT_OPS_DEPTH): number {
  return depth.haul.byBuildingId[buildingDefId] ?? 0;
}

export function sellTransportFeePerUnit(itemId: string, depth: OpsDepthConfig = DEFAULT_OPS_DEPTH): number {
  return depth.sellTransport[itemId] ?? 0;
}

/** 賣出淨額；運費高於售價總額時回傳 null（拒賣）。 */
export function resolveSellGoldAfterTransport(
  itemId: string,
  unitPrice: number,
  qty: number,
  depth: OpsDepthConfig = DEFAULT_OPS_DEPTH,
): { gross: number; transportFee: number; netGold: number } | null {
  const gross = unitPrice * qty;
  const transportFee = sellTransportFeePerUnit(itemId, depth) * qty;
  if (transportFee > gross) return null;
  return { gross, transportFee, netGold: gross - transportFee };
}

export function opsCostsFromDepth(depth: OpsDepthConfig = DEFAULT_OPS_DEPTH): OpsCostsSnapshot {
  return {
    hireCostGold: depth.workforce.hireCostGold,
    wageByBuilding: { ...depth.wages.byBuildingId },
    haulByBuilding: { ...depth.haul.byBuildingId },
    sellTransport: { ...depth.sellTransport },
    laborCostPerStart: depth.workforce.laborCostPerStart,
  };
}
