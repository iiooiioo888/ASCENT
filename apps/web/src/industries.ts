import { ITEM_GOLD_ID, ITEM_OIL_ID, playableBuildingDefs, playableRules } from "@ascent/shared";

/** 每個可玩產業一張選項卡。順序＝主介面 tab 順序。 */
export const INDUSTRY_TABS = [
  { id: "agriculture", label: "農業" },
  { id: "mining", label: "礦業" },
  { id: "timber", label: "林木" },
  { id: "chemical", label: "化工" },
  { id: "industry", label: "工業" },
  { id: "energy", label: "能源" },
] as const;

export type IndustryId = (typeof INDUSTRY_TABS)[number]["id"];

const INDUSTRY_IDS = new Set<string>(INDUSTRY_TABS.map((tab) => tab.id));

const SYSTEM_BY_BUILDING_DEF = new Map(
  playableBuildingDefs.map((def) => [def.id, def.system_code] as const),
);

export function isIndustryId(value: string): value is IndustryId {
  return INDUSTRY_IDS.has(value);
}

/** 目錄裡的建築對到所屬產業。未知 id 回農業，避免卡從畫面上消失。 */
export function industryOfBuildingDef(buildingDefId: string): IndustryId {
  const system = SYSTEM_BY_BUILDING_DEF.get(buildingDefId);
  if (system && isIndustryId(system)) return system;
  return "agriculture";
}

export function inIndustry<T extends { id?: string; buildingDefId?: string }>(
  row: T,
  industry: IndustryId,
): boolean {
  const defId = row.buildingDefId ?? row.id;
  if (!defId) return false;
  return industryOfBuildingDef(defId) === industry;
}

const ITEM_INDUSTRY = buildItemIndustry();

/** 產品歸到產出它的產業。金錢（item_gold）與大宗不進任何產業卡。 */
export function industryOfItem(itemId: string): IndustryId | null {
  if (itemId === ITEM_GOLD_ID || itemId === ITEM_OIL_ID) return null;
  return ITEM_INDUSTRY.get(itemId) ?? null;
}

function buildItemIndustry(): Map<string, IndustryId> {
  const ruleIndustry = new Map<string, IndustryId>();
  for (const def of playableBuildingDefs) {
    if (!isIndustryId(def.system_code)) continue;
    for (const ruleId of def.allowed_rule_ids) {
      if (!ruleIndustry.has(ruleId)) ruleIndustry.set(ruleId, def.system_code);
    }
  }
  const itemIndustry = new Map<string, IndustryId>();
  for (const rule of playableRules) {
    const industry = ruleIndustry.get(rule.id);
    if (!industry) continue;
    for (const output of rule.outputs) {
      if (!itemIndustry.has(output.item_id)) itemIndustry.set(output.item_id, industry);
    }
  }
  return itemIndustry;
}
