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

/** GET /state `buildingDefs` 可用欄位（API 為 camelCase，亦容忍 snake_case）。 */
export type BuildingDefIndustrySource = {
  id: string;
  code?: string;
  systemCode?: string;
  system_code?: string;
};

const INDUSTRY_IDS = new Set<string>(INDUSTRY_TABS.map((tab) => tab.id));

const CATALOG_SYSTEM_BY_BUILDING_DEF = new Map(
  playableBuildingDefs.map((def) => [def.id, def.system_code] as const),
);

export function isIndustryId(value: string): value is IndustryId {
  return INDUSTRY_IDS.has(value);
}

function readSystemCode(source: BuildingDefIndustrySource | undefined): string | undefined {
  if (!source) return undefined;
  const raw = source.systemCode ?? source.system_code;
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  return raw.trim();
}

function resolveSystemCode(
  buildingDefId: string,
  defById: Map<string, BuildingDefIndustrySource>,
): string | undefined {
  const fromApi = readSystemCode(defById.get(buildingDefId));
  if (fromApi) return fromApi;
  return CATALOG_SYSTEM_BY_BUILDING_DEF.get(buildingDefId);
}

function systemCodeToIndustry(system: string | undefined): IndustryId {
  if (system && isIndustryId(system)) return system;
  return "agriculture";
}

function buildItemIndustry(industryForDef: (buildingDefId: string) => IndustryId): Map<string, IndustryId> {
  const ruleIndustry = new Map<string, IndustryId>();
  for (const def of playableBuildingDefs) {
    const industry = industryForDef(def.id);
    for (const ruleId of def.allowed_rule_ids) {
      if (!ruleIndustry.has(ruleId)) ruleIndustry.set(ruleId, industry);
    }
  }
  const itemIndustry = new Map<string, IndustryId>();
  for (const rule of playableRules) {
    const industry = ruleIndustry.get(rule.id);
    if (!industry) continue;
    for (const output of rule.outputs) {
      if (!itemIndustry.has(output.item_id)) itemIndustry.set(output.item_id, industry);
    }
    for (const input of rule.inputs) {
      if (!input.item_id.includes("_seed_")) continue;
      if (!itemIndustry.has(input.item_id)) itemIndustry.set(input.item_id, industry);
    }
  }
  return itemIndustry;
}

export type IndustryModel = {
  industryOfBuildingDef: (buildingDefId: string) => IndustryId;
  inIndustry: <T extends { id?: string; buildingDefId?: string }>(row: T, industry: IndustryId) => boolean;
  industryOfItem: (itemId: string) => IndustryId | null;
};

/** 依 state.buildingDefs 的 systemCode 分組；缺欄時回退 shared 目錄。 */
export function createIndustryModel(apiBuildingDefs: BuildingDefIndustrySource[] = []): IndustryModel {
  const defById = new Map(apiBuildingDefs.map((def) => [def.id, def]));

  function industryOfBuildingDef(buildingDefId: string): IndustryId {
    return systemCodeToIndustry(resolveSystemCode(buildingDefId, defById));
  }

  function inIndustry<T extends { id?: string; buildingDefId?: string }>(
    row: T,
    industry: IndustryId,
  ): boolean {
    const defId = row.buildingDefId ?? row.id;
    if (!defId) return false;
    return industryOfBuildingDef(defId) === industry;
  }

  const itemIndustry = buildItemIndustry(industryOfBuildingDef);

  function industryOfItem(itemId: string): IndustryId | null {
    if (itemId === ITEM_GOLD_ID || itemId === ITEM_OIL_ID) return null;
    return itemIndustry.get(itemId) ?? null;
  }

  return { industryOfBuildingDef, inIndustry, industryOfItem };
}

const defaultModel = createIndustryModel();

/** 無 API 上下文時使用 shared 目錄（單元測試與靜態推導）。 */
export const industryOfBuildingDef = defaultModel.industryOfBuildingDef;
export const inIndustry = defaultModel.inIndustry;
export const industryOfItem = defaultModel.industryOfItem;
