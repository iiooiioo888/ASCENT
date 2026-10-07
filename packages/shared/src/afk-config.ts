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
