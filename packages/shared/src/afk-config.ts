/** AFK P1.5：建築預設主配方（AFK-D3）；無生產能力的建築為 null。 */
export const DEFAULT_AUTO_METHOD_BY_BUILDING_DEF_ID: Record<string, string> = {
  bdef_field: "method_grow_wheat_default",
  bdef_mill: "method_mill_flour_default",
  bdef_oven: "method_bake_bread_default",
  bdef_well: "method_draw_water_default",
};

export const AFK_AUTO_PAUSE_REASON = {
  MATERIALS: "自動已暫停：物料不足",
  GOLD: "自動已暫停：金幣不足（工資／運費）",
  WORKFORCE: "自動已暫停：人手不足",
} as const;

export type AfkAutoPauseReason = (typeof AFK_AUTO_PAUSE_REASON)[keyof typeof AFK_AUTO_PAUSE_REASON];

export function defaultAutoMethodIdForBuilding(buildingDefId: string): string | null {
  return DEFAULT_AUTO_METHOD_BY_BUILDING_DEF_ID[buildingDefId] ?? null;
}

/** 將現有 start 閘錯誤對齊 AFK-D5 暫停文案；無法對齊時回傳 null。 */
export function mapStartFailureToAutoPauseReason(message: string): AfkAutoPauseReason | null {
  if (message === "人手不足") return AFK_AUTO_PAUSE_REASON.WORKFORCE;
  if (message === "金幣不足" || message.includes("金幣不足")) return AFK_AUTO_PAUSE_REASON.GOLD;
  if (message.startsWith("資源不足")) return AFK_AUTO_PAUSE_REASON.MATERIALS;
  return null;
}

export type PlayerBuildingAfkFields = {
  autoEnabled: boolean;
  autoPauseReason: string | null;
};

/** AFK-SMART D1：麵包鏈搶資源時下游優先（爐 → 磨 → 田）。 */
export const BREAD_CHAIN_AUTO_START_PRIORITY: Record<string, number> = {
  bdef_oven: 0,
  bdef_mill: 1,
  bdef_field: 2,
};

export function compareBuildingsForAfkAutoStart(
  a: { buildingDefId: string; id?: string },
  b: { buildingDefId: string; id?: string },
): number {
  const pa = BREAD_CHAIN_AUTO_START_PRIORITY[a.buildingDefId] ?? 100;
  const pb = BREAD_CHAIN_AUTO_START_PRIORITY[b.buildingDefId] ?? 100;
  if (pa !== pb) return pa - pb;
  return (a.id ?? "").localeCompare(b.id ?? "");
}

export function sortBuildingsForAfkAutoStart<T extends { buildingDefId: string; id: string }>(
  buildings: T[],
): T[] {
  return [...buildings].sort(compareBuildingsForAfkAutoStart);
}
