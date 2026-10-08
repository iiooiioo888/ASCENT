import { Injectable } from "@nestjs/common";
import {
  generateMethods,
  validateCatalog,
  type ItemDef,
  type ItemIo,
  type ProductionMethodDef,
  type ProductionRuleDef,
} from "@ascent/shared";
import { PrismaService } from "../prisma/prisma.service";
import { gameConfigFromRow } from "../simulation/game-config.loader";

@Injectable()
export class RulesService {
  constructor(private readonly prisma: PrismaService) {}

  productionRules() {
    return this.prisma.productionRule.findMany({ where: { isActive: true } });
  }

  productionRule(id: string) {
    return this.prisma.productionRule.findFirst({ where: { id, isActive: true } });
  }

  productionMethods() {
    return this.prisma.productionMethod.findMany({ where: { isActive: true } });
  }

  productionMethod(id: string) {
    return this.prisma.productionMethod.findFirst({ where: { id, isActive: true } });
  }

  loops() {
    return [
      {
        id: "loop_agriculture_bread",
        name: "農業麵包閉環",
        steps: ["rule_grow_wheat", "rule_mill_flour", "rule_make_dough", "rule_bake_bread"],
      },
      {
        id: "loop_feed_livestock",
        name: "飼料畜牧支線",
        steps: ["rule_mix_feed", "rule_raise_livestock"],
      },
    ];
  }

  async validate() {
    const [items, rules, methods, gameRow] = await Promise.all([
      this.prisma.item.findMany(),
      this.prisma.productionRule.findMany(),
      this.prisma.productionMethod.findMany(),
      this.prisma.gameConfig.findUnique({ where: { id: 1 } }),
    ]);
    const config = gameConfigFromRow(gameRow);
    const mappedRules: ProductionRuleDef[] = rules.map((r) => ({
      id: r.id,
      code: r.code,
      parent_rule_id: r.parentRuleId,
      inputs: r.inputs as ItemIo[],
      outputs: r.outputs as ItemIo[],
      duration_game_sec: r.durationGameSec,
      formulas: r.formulas as Record<string, string>,
      compositions: r.compositions as string[],
      overrides: r.overrides as Record<string, unknown>,
      optimizations: r.optimizations as ProductionRuleDef["optimizations"],
      is_active: r.isActive,
      released_in_version: r.releasedInVersion,
    }));
    const mappedMethods: ProductionMethodDef[] = methods.map((m) => ({
      id: m.id,
      code: m.code,
      rule_id: m.ruleId,
      optimization: m.optimization as Record<string, unknown>,
      inputs: m.inputs as ItemIo[],
      outputs: m.outputs as ItemIo[],
      duration_game_sec: m.durationGameSec,
      is_active: m.isActive,
      released_in_version: m.releasedInVersion,
    }));
    const errors = validateCatalog({
      items: items.map((i) => ({
        id: i.id,
        code: i.code,
        type_id: i.typeId,
        layer: i.layer as ItemDef["layer"],
        derived_tier: i.derivedTier,
        is_active: i.isActive,
        released_in_version: i.releasedInVersion,
      })),
      rules: mappedRules,
      methods: mappedMethods,
      config,
    });
    return { ok: errors.length === 0, errors, generatedPreview: generateMethods(mappedRules).map((m) => m.id) };
  }
}
