import type { ItemIo, OptimizationSpec, ProductionMethodDef, ProductionRuleDef } from "./types";

function scaleIos(ios: ItemIo[], factor: number): ItemIo[] {
  return ios.map((io) => ({ ...io, qty: io.qty * factor }));
}

function scaleNamedInputs(ios: ItemIo[], factors: Record<string, number>): ItemIo[] {
  return ios.map((io) => {
    const factor = (io.key && factors[io.key]) || factors[io.item_id] || 1;
    return { ...io, qty: io.qty * factor };
  });
}

export function generateMethods(rules: ProductionRuleDef[]): ProductionMethodDef[] {
  const methods: ProductionMethodDef[] = [];
  for (const rule of rules) {
    if (!rule.is_active) continue;
    methods.push(methodFrom(rule, "default", {}, 1, 1, 1));
    for (const opt of rule.optimizations ?? []) {
      methods.push(
        methodFrom(
          rule,
          opt.code,
          opt,
          opt.duration_factor ?? 1,
          opt.output_factor ?? 1,
          1,
          opt.input_factor,
        ),
      );
    }
  }
  return methods;
}

function methodFrom(
  rule: ProductionRuleDef,
  optCode: string,
  optimization: Record<string, unknown>,
  durationFactor: number,
  outputFactor: number,
  _unused: number,
  inputFactor?: Record<string, number>,
): ProductionMethodDef {
  const duration = Math.max(1, Math.round(rule.duration_game_sec * durationFactor));
  const inputs = inputFactor ? scaleNamedInputs(rule.inputs, inputFactor) : [...rule.inputs];
  const outputs = scaleIos(rule.outputs, outputFactor);
  return {
    id: `method_${rule.code}_${optCode}`,
    code: `method_${rule.code}_${optCode}`,
    rule_id: rule.id,
    optimization,
    inputs,
    outputs,
    duration_game_sec: duration,
    is_active: true,
    released_in_version: rule.released_in_version,
  };
}

export type { OptimizationSpec };
