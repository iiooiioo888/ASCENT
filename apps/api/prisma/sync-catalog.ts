import { Prisma, PrismaClient } from "../generated/prisma/client";
import { createPrismaAdapter } from "../src/prisma/create-prisma-adapter";
import {
  generateMethods,
  itemProperties,
  playableBuildingDefs as buildingDefs,
  playableItemTypes as itemTypes,
  playableItems as items,
  playableRules as rules,
  validateCatalog,
} from "@ascent/shared";

export type CatalogSyncClient = Pick<
  PrismaClient,
  | "itemProperty"
  | "itemType"
  | "item"
  | "productionRule"
  | "productionMethod"
  | "buildingDef"
  | "buildingLevel"
>;

/** 冪等 upsert 靜態目錄（物品／規則／方式／建築定義）；不刪除、不修改玩家資料。 */
export async function syncCatalog(prisma: CatalogSyncClient): Promise<void> {
  const methods = generateMethods(rules);
  const errors = validateCatalog({ items, rules, methods });
  if (errors.length) {
    throw new Error(`catalog 驗證失敗: ${JSON.stringify(errors)}`);
  }

  for (const p of itemProperties) {
    await prisma.itemProperty.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        code: p.code,
        name: p.name,
        valueKind: p.value_kind,
        isActive: p.is_active,
        releasedInVersion: p.released_in_version,
      },
      update: {
        code: p.code,
        name: p.name,
        valueKind: p.value_kind,
        isActive: p.is_active,
        releasedInVersion: p.released_in_version,
      },
    });
  }

  for (const t of itemTypes) {
    await prisma.itemType.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        code: t.code,
        name: t.name,
        isActive: t.is_active,
        releasedInVersion: t.released_in_version,
        metadata: {},
      },
      update: {
        code: t.code,
        name: t.name,
        isActive: t.is_active,
        releasedInVersion: t.released_in_version,
      },
    });
  }

  for (const item of items) {
    await prisma.item.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        code: item.code,
        typeId: item.type_id,
        layer: item.layer,
        derivedTier: item.derived_tier,
        isActive: item.is_active,
        releasedInVersion: item.released_in_version,
        properties: {},
      },
      update: {
        code: item.code,
        typeId: item.type_id,
        layer: item.layer,
        derivedTier: item.derived_tier,
        isActive: item.is_active,
        releasedInVersion: item.released_in_version,
      },
    });
  }

  for (const rule of rules) {
    await prisma.productionRule.upsert({
      where: { id: rule.id },
      create: {
        id: rule.id,
        code: rule.code,
        parentRuleId: rule.parent_rule_id,
        inputs: rule.inputs,
        outputs: rule.outputs,
        durationGameSec: rule.duration_game_sec,
        formulas: rule.formulas,
        compositions: rule.compositions,
        overrides: rule.overrides as Prisma.InputJsonValue,
        optimizations: (rule.optimizations ?? []) as Prisma.InputJsonValue,
        isActive: rule.is_active,
        releasedInVersion: rule.released_in_version,
      },
      update: {
        code: rule.code,
        parentRuleId: rule.parent_rule_id,
        inputs: rule.inputs,
        outputs: rule.outputs,
        durationGameSec: rule.duration_game_sec,
        formulas: rule.formulas,
        compositions: rule.compositions,
        overrides: rule.overrides as Prisma.InputJsonValue,
        optimizations: (rule.optimizations ?? []) as Prisma.InputJsonValue,
        isActive: rule.is_active,
        releasedInVersion: rule.released_in_version,
      },
    });
  }

  for (const method of methods) {
    await prisma.productionMethod.upsert({
      where: { id: method.id },
      create: {
        id: method.id,
        code: method.code,
        ruleId: method.rule_id,
        optimization: method.optimization as Prisma.InputJsonValue,
        inputs: method.inputs,
        outputs: method.outputs,
        durationGameSec: method.duration_game_sec,
        isActive: method.is_active,
        releasedInVersion: method.released_in_version,
      },
      update: {
        code: method.code,
        ruleId: method.rule_id,
        optimization: method.optimization as Prisma.InputJsonValue,
        inputs: method.inputs,
        outputs: method.outputs,
        durationGameSec: method.duration_game_sec,
        isActive: method.is_active,
        releasedInVersion: method.released_in_version,
      },
    });
  }

  for (const b of buildingDefs) {
    await prisma.buildingDef.upsert({
      where: { id: b.id },
      create: {
        id: b.id,
        code: b.code,
        name: b.name,
        systemCode: b.system_code,
        allowedRuleIds: b.allowed_rule_ids,
        isActive: b.is_active,
        releasedInVersion: b.released_in_version,
      },
      update: {
        code: b.code,
        name: b.name,
        systemCode: b.system_code,
        allowedRuleIds: b.allowed_rule_ids,
        isActive: b.is_active,
        releasedInVersion: b.released_in_version,
      },
    });
    await prisma.buildingLevel.upsert({
      where: { buildingDefId_level: { buildingDefId: b.id, level: 1 } },
      create: {
        buildingDefId: b.id,
        level: 1,
        queueLimit: b.queue_limit,
        modifiers: {},
      },
      update: {
        queueLimit: b.queue_limit,
      },
    });
  }
}

export async function runSyncCatalogCli(): Promise<void> {
  const prisma = new PrismaClient({ adapter: createPrismaAdapter() });
  try {
    await syncCatalog(prisma);
    console.log(
      `[sync-catalog] 完成：${items.length} 物品、${rules.length} 規則、${generateMethods(rules).length} 方式、${buildingDefs.length} 建築定義`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

const isCli = process.argv[1]?.replace(/\\/g, "/").includes("sync-catalog");
if (isCli) {
  runSyncCatalogCli().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
