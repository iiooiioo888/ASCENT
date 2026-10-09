import {
  DRAW_WATER_DURATION_GAME_SEC,
  DRAW_WATER_OUTPUT_QTY,
  rules as agriRules,
} from "./agriculture-catalog";
import { TIME_SCALE } from "./config";
import { industryRules } from "./industry-catalog";
import { DEFAULT_MARKET_PRICES } from "./market-config";
import type { ProductionRuleDef } from "./types";

export type LoopProfitRow = {
  id: string;
  label: string;
  slots: number;
  cycleGameSec: number;
  cycleRealSec: number;
  copperIn: number;
  copperOut: number;
  copperNet: number;
  copperPerRealHour: number;
};

function ruleById(id: string, pool: ProductionRuleDef[]): ProductionRuleDef {
  const found = pool.find((row) => row.id === id);
  if (!found) throw new Error(`missing rule ${id}`);
  return found;
}

function buyCost(itemId: string, qty: number): number {
  const unit = DEFAULT_MARKET_PRICES.buy[itemId];
  if (unit == null) return 0;
  return unit * qty;
}

function sellRevenue(itemId: string, qty: number): number {
  const unit = DEFAULT_MARKET_PRICES.sell[itemId];
  if (unit == null) return 0;
  return unit * qty;
}

function row(
  id: string,
  label: string,
  slots: number,
  cycleGameSec: number,
  copperIn: number,
  copperOut: number,
): LoopProfitRow {
  const cycleRealSec = cycleGameSec / TIME_SCALE;
  const copperNet = copperOut - copperIn;
  const copperPerRealHour = cycleRealSec > 0 ? (copperNet * 3600) / cycleRealSec : 0;
  return {
    id,
    label,
    slots,
    cycleGameSec,
    cycleRealSec,
    copperIn,
    copperOut,
    copperNet,
    copperPerRealHour,
  };
}

/** 種→磨→麵→烤：田＋磨坊＋爐；水以商行買入計成本。 */
export function breadLoopBoughtWater(): LoopProfitRow {
  const grow = ruleById("rule_grow_wheat", agriRules);
  const mill = ruleById("rule_mill_flour", agriRules);
  const dough = ruleById("rule_make_dough", agriRules);
  const bake = ruleById("rule_bake_bread", agriRules);
  const seedIn = grow.inputs.find((io) => io.item_id === "item_seed_wheat")?.qty ?? 1;
  const waterGrow = grow.inputs.find((io) => io.item_id === "item_water")?.qty ?? 1;
  const waterDough = dough.inputs.find((io) => io.item_id === "item_water")?.qty ?? 1;
  const cycleGameSec = Math.max(
    grow.duration_game_sec,
    mill.duration_game_sec,
    dough.duration_game_sec + bake.duration_game_sec,
  );
  const copperIn = buyCost("item_seed_wheat", seedIn) + buyCost("item_water", waterGrow + waterDough);
  const copperOut = sellRevenue("item_bread", bake.outputs[0]?.qty ?? 1);
  return row("bread-bought-water", "種→磨→麵→烤（買水／買種）", 3, cycleGameSec, copperIn, copperOut);
}

/** 同上，但水由水井汲水負擔工時（不佔農業 12 槽以外的策略槽時仍計 4 座）。 */
export function breadLoopWellWater(): LoopProfitRow {
  const bought = breadLoopBoughtWater();
  const waterNeeded = 2;
  const drawCycles = Math.ceil(waterNeeded / DRAW_WATER_OUTPUT_QTY);
  const wellGameSec = drawCycles * DRAW_WATER_DURATION_GAME_SEC;
  const cycleGameSec = Math.max(bought.cycleGameSec, wellGameSec);
  const copperIn = buyCost("item_seed_wheat", 1);
  return row("bread-well-water", "種→磨→麵→烤（井水／買種）", 4, cycleGameSec, copperIn, bought.copperOut);
}

/** 鐵礦＋煤 → 鐵錠 → 焦炭 → 鋼。礦坑與冶煉爐各 1（煤與鐵礦同分時序）。 */
export function steelLoop(): LoopProfitRow {
  const mineIron = ruleById("rule_mine_iron", industryRules);
  const mineCoal = ruleById("rule_mine_coal", industryRules);
  const smelt = ruleById("rule_smelt_iron_coal", industryRules);
  const coke = ruleById("rule_make_coke", industryRules);
  const steel = ruleById("rule_make_steel", industryRules);
  const waterForOre = mineIron.inputs.find((io) => io.item_id === "item_water")?.qty ?? 0;
  const coalForSmelt = smelt.inputs.find((io) => io.item_id === "item_coal")?.qty ?? 1;
  const coalForCoke = coke.inputs.find((io) => io.item_id === "item_coal")?.qty ?? 2;
  const coalNeeded = coalForSmelt + coalForCoke;
  const coalPerMine = mineCoal.outputs[0]?.qty ?? 2;
  const mineCoalGameSec = Math.ceil(coalNeeded / coalPerMine) * mineCoal.duration_game_sec;
  const pitGameSec = mineIron.duration_game_sec + mineCoalGameSec;
  const cycleGameSec = Math.max(pitGameSec, smelt.duration_game_sec, coke.duration_game_sec, steel.duration_game_sec);
  const copperIn = buyCost("item_water", waterForOre) + buyCost("item_coal", 0);
  const copperOut = sellRevenue("item_steel", steel.outputs[0]?.qty ?? 1);
  return row("iron-steel", "鐵礦→鐵錠→鋼", 2, cycleGameSec, copperIn, copperOut);
}

export function profitSimRows(): LoopProfitRow[] {
  return [breadLoopBoughtWater(), breadLoopWellWater(), steelLoop()];
}

export function formatProfitSimTable(rows: LoopProfitRow[] = profitSimRows()): string {
  const header =
    "| 迴路 | 槽 | 週期遊戲秒 | 週期現實秒 | 銅錠成本 | 銅錠收入 | 淨利 | 現實每小時淨利 |";
  const sep = "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |";
  const body = rows.map((r) =>
    `| ${r.label} | ${r.slots} | ${r.cycleGameSec} | ${r.cycleRealSec.toFixed(0)} | ${r.copperIn} | ${r.copperOut} | ${r.copperNet} | ${r.copperPerRealHour.toFixed(1)} |`,
  );
  return [header, sep, ...body].join("\n");
}
