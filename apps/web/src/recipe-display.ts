import { fmtIo } from "./format";
import { METHOD_RECIPE_DISPLAY } from "./resource-loop-copy";
import type { Method } from "./types";

export function recipeConsumeLine(method: Method | undefined): string {
  if (!method) return "";
  const override = METHOD_RECIPE_DISPLAY[method.id];
  if (override) return override.consume;
  return method.inputs.length ? fmtIo(method.inputs) : "—";
}

export function recipeProduceLine(method: Method | undefined): string {
  if (!method) return "";
  const override = METHOD_RECIPE_DISPLAY[method.id];
  if (override) return override.produce;
  return fmtIo(method.outputs);
}
