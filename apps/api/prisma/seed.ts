import { PrismaClient } from "../generated/prisma/client";
import { createPrismaAdapter } from "../src/prisma/create-prisma-adapter";
import {
  LOCAL_PLAYER_ID,
  MAX_OFFLINE_GAME_SEC,
  MAX_OFFLINE_REAL_SEC,
  TIME_SCALE,
  TICK_INTERVAL_REAL_MS,
  GAME_DAY_GAME_SEC,
  buildingDefs,
  generateMethods,
  itemProperties,
  itemTypes,
  items,
  rules,
  startingInventory,
  validateCatalog,
} from "@ascent/shared";

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main() {
  const methods = generateMethods(rules);
  const errors = validateCatalog({ items, rules, methods });
  if (errors.length) {
    throw new Error(`種子驗證失敗: ${JSON.stringify(errors)}`);
  }

  const now = new Date();

  await prisma.playerBuilding.deleteMany();
  await prisma.playerInventory.deleteMany();
  await prisma.player.deleteMany();
  await prisma.buildingLevel.deleteMany();
  await prisma.productionMethod.deleteMany();
  await prisma.productionRule.deleteMany();
  await prisma.item.deleteMany();
  await prisma.itemType.deleteMany();
  await prisma.itemProperty.deleteMany();
  await prisma.buildingDef.deleteMany();
  await prisma.gameConfig.deleteMany();
  await prisma.serverState.deleteMany();

  await prisma.gameConfig.create({
    data: {
      id: 1,
      timeScale: TIME_SCALE,
      gameDayGameSec: GAME_DAY_GAME_SEC,
      maxOfflineRealSec: MAX_OFFLINE_REAL_SEC,
      maxOfflineGameSec: MAX_OFFLINE_GAME_SEC,
      tickIntervalRealMs: TICK_INTERVAL_REAL_MS,
    },
  });

  await prisma.serverState.create({
    data: {
      id: 1,
      startRealTime: now,
      startGameTime: 0,
      lastUpdate: now,
    },
  });

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
    await prisma.itemType.create({
      data: {
        id: t.id,
        code: t.code,
        name: t.name,
        isActive: t.is_active,
        releasedInVersion: t.released_in_version,
        metadata: {},
      },
    });
  }

  for (const item of items) {
    await prisma.item.create({
      data: {
        id: item.id,
        code: item.code,
        typeId: item.type_id,
        layer: item.layer,
        derivedTier: item.derived_tier,
        isActive: item.is_active,
        releasedInVersion: item.released_in_version,
        properties: {},
      },
    });
  }

  for (const rule of rules) {
    await prisma.productionRule.create({
      data: {
        id: rule.id,
        code: rule.code,
        parentRuleId: rule.parent_rule_id,
        inputs: rule.inputs,
        outputs: rule.outputs,
        durationGameSec: rule.duration_game_sec,
        formulas: rule.formulas,
        compositions: rule.compositions,
        overrides: rule.overrides,
        optimizations: rule.optimizations ?? [],
        isActive: rule.is_active,
        releasedInVersion: rule.released_in_version,
      },
    });
  }

  for (const method of methods) {
    await prisma.productionMethod.create({
      data: {
        id: method.id,
        code: method.code,
        ruleId: method.rule_id,
        optimization: method.optimization,
        inputs: method.inputs,
        outputs: method.outputs,
        durationGameSec: method.duration_game_sec,
        isActive: method.is_active,
        releasedInVersion: method.released_in_version,
      },
    });
  }

  for (const b of buildingDefs) {
    await prisma.buildingDef.create({
      data: {
        id: b.id,
        code: b.code,
        name: b.name,
        systemCode: b.system_code,
        allowedRuleIds: b.allowed_rule_ids,
        isActive: b.is_active,
        releasedInVersion: b.released_in_version,
      },
    });
    await prisma.buildingLevel.create({
      data: {
        buildingDefId: b.id,
        level: 1,
        queueLimit: b.queue_limit,
        modifiers: {},
      },
    });
  }

  await prisma.player.create({
    data: {
      id: LOCAL_PLAYER_ID,
      createdAt: now,
      lastSeenAt: now,
    },
  });

  for (const [itemId, qty] of Object.entries(startingInventory)) {
    await prisma.playerInventory.create({
      data: {
        playerId: LOCAL_PLAYER_ID,
        itemId,
        quantity: qty,
      },
    });
  }

  const toPlace = ["bdef_field", "bdef_mill", "bdef_oven"];
  for (const defId of toPlace) {
    await prisma.playerBuilding.create({
      data: {
        id: `pb_${LOCAL_PLAYER_ID}_${defId}`,
        playerId: LOCAL_PLAYER_ID,
        buildingDefId: defId,
        lastSettledAt: now,
        lastSettledGame: 0,
        lastUpdate: now,
        lastUpdateGame: 0,
        queue: [],
        inputs: {},
        outputs: {},
        bufferedOutputs: {},
        status: "idle",
      },
    });
  }

  console.log(
    `種子完成：${items.length} 物品、${itemProperties.length} 屬性定義、${rules.length} 規則、${methods.length} 方式`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
