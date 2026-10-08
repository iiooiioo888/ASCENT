import { METHOD_NAME, buildingDefs, itemTypes, items, rules } from "./agriculture-catalog";
import {
  industryBuildingDefs,
  industryItemTypes,
  industryItems,
  industryMethodNames,
  industryRules,
} from "./industry-catalog";

/** 對局目錄：農業切片＋產業擴充。農業切片本身的匯出維持 5–10 方式不變。 */
export const playableItemTypes = [...itemTypes, ...industryItemTypes];
export const playableItems = [...items, ...industryItems];
export const playableRules = [...rules, ...industryRules];
export const playableBuildingDefs = [...buildingDefs, ...industryBuildingDefs];
export const playableMethodNames: Record<string, string> = {
  ...METHOD_NAME,
  ...industryMethodNames,
};
