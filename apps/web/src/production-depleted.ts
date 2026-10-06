import { canAffordInputs, inventoryQtyMap } from "./inventory";
import type { Building, GameState, Method } from "./types";

function methodsForBuilding(building: Building, methodsByRule: Map<string, Method[]>): Method[] {
  const allowed = building.buildingDef.allowedRuleIds ?? [];
  return allowed.flatMap((rid) => methodsByRule.get(rid) ?? []);
}

/**
 * 生產已暫停：所有已放建築皆無 running/ready，且每座可開工建築的所有方式皆缺料。
 * 水井「汲水」無輸入時視為可開工（不顯示耗盡橫幅）。
 */
export function isProductionDepleted(state: Pick<GameState, "buildings" | "methods" | "inventory">): boolean {
  if (state.buildings.some((b) => b.status === "running" || b.status === "ready")) {
    return false;
  }

  const methodsByRule = new Map<string, Method[]>();
  for (const method of state.methods) {
    const arr = methodsByRule.get(method.ruleId) ?? [];
    arr.push(method);
    methodsByRule.set(method.ruleId, arr);
  }

  const stock = inventoryQtyMap(state.inventory);
  let hasProducibleBuilding = false;

  for (const building of state.buildings) {
    if (building.status !== "idle") continue;
    const options = methodsForBuilding(building, methodsByRule);
    if (!options.length) continue;
    hasProducibleBuilding = true;
    if (options.some((m) => canAffordInputs(stock, m.inputs))) {
      return false;
    }
  }

  return hasProducibleBuilding;
}
