import { TIME_SCALE } from "./config";

/** HUD 低庫存：水少於此時視為早期卡水。 */
export const LOW_WATER_QTY = 2;
/** HUD 低庫存：種子少於此時視為卡種。 */
export const LOW_SEED_QTY = 2;

/** 收取 8 個麵包後田上限從早期 2 升到 12（與槽位相等）。 */
export const FIELD_CAP_UNLOCK_BREAD_QTY = 8;

/** 教學腳本（現實秒）：每個概念只教一次。 */
export const TUTORIAL_REAL_SEC = {
  plant: 2 * 60,
  mill: 5 * 60,
  breadSale: 10 * 60,
  saveSeed: 20 * 60,
  expand: 30 * 60,
} as const;

export type TutorialStepId = "plant" | "mill" | "bread" | "saveSeed" | "expand" | "loop";

export type TutorialCoach = {
  id: TutorialStepId;
  title: string;
  body: string;
};

export type SessionDecisionKind = "save_seed" | "order" | "buy_field" | "storage" | "afk";

export type SessionDecision = {
  kind: SessionDecisionKind;
  prompt: string;
};

export function realElapsedSec(displayGameTime: number, timeScale = TIME_SCALE): number {
  if (!Number.isFinite(displayGameTime) || timeScale <= 0) return 0;
  return Math.max(0, displayGameTime / timeScale);
}

export function resolveTutorialCoach(input: {
  displayGameTime: number;
  timeScale?: number;
  lifetimeCollected: Record<string, number>;
  seedGeneration: number;
  fieldCount: number;
}): TutorialCoach {
  const realSec = realElapsedSec(input.displayGameTime, input.timeScale);
  const wheat = input.lifetimeCollected.item_wheat ?? 0;
  const flour = input.lifetimeCollected.item_flour ?? 0;
  const bread = input.lifetimeCollected.item_bread ?? 0;

  if (wheat < 1 && realSec < TUTORIAL_REAL_SEC.mill) {
    return { id: "plant", title: "種 → 水 → 收", body: "先在田開工種麥。水不夠就去水井排隊汲水。" };
  }
  if (flour < 1 && bread < 1 && realSec < TUTORIAL_REAL_SEC.breadSale) {
    return { id: "mill", title: "磨坊開了", body: "小麥收齊後送磨坊。多段加工才有利潤。" };
  }
  if (bread < 1) {
    return {
      id: "bread",
      title: "烤出第一個麵包",
      body: "爐和麵再烘烤。第一個麵包賣掉會有明顯的銅錠入帳。",
    };
  }
  if (input.seedGeneration < 1 && realSec < TUTORIAL_REAL_SEC.expand) {
    return {
      id: "saveSeed",
      title: "留種是投資",
      body: "留高：現金差、代數升、以後每代 +20% 麥。留低：現金漂亮，但買種會把代數沖回 0。",
    };
  }
  if (input.fieldCount <= 1 && realSec >= TUTORIAL_REAL_SEC.saveSeed) {
    return {
      id: "expand",
      title: "12 格怎麼擺",
      body: "加田、輪作或改密集（佔 2 格換 130% 產出）。每塊田都在擠壓槽位與倉格。",
    };
  }
  return {
    id: "loop",
    title: "上線十分鐘",
    body: "看離線報告 → 處理訂單／滿倉 → 做一個決定（留種、接單或加田）→ 掛機。",
  };
}

export function resolveSessionDecision(input: {
  pendingOrderCount: number;
  storageFill: number;
  seedGeneration: number;
  fieldCount: number;
  fieldCap: number;
  readyBuildingCount: number;
}): SessionDecision {
  if (input.readyBuildingCount > 0) {
    return { kind: "storage", prompt: "先收取完成的建築，再決定這輪要幹嘛。" };
  }
  if (input.storageFill >= 0.8) {
    return { kind: "storage", prompt: "倉快滿了：賣掉，或留著加工換訂單。" };
  }
  if (input.pendingOrderCount > 0) {
    return { kind: "order", prompt: "訂單板上有單。接了就得少留一點種。" };
  }
  if (input.fieldCount < input.fieldCap && input.fieldCount < 2) {
    return { kind: "buy_field", prompt: "第二塊田是中期硬瓶頸。買不買？" };
  }
  if (input.seedGeneration < 1) {
    return { kind: "save_seed", prompt: "這輪要不要留種？代數不會自己長。" };
  }
  return { kind: "afk", prompt: "決定做完了。掛機讓懶結算跑，下線前確認自動開工。" };
}
