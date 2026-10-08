import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  FIELD_BUILDING_DEF_ID,
  FIELD_CAP,
  ITEM_GOLD_ID,
  LAND_ERROR_COPY,
  LOCAL_PLAYER_ID,
  PLAYER_BUILDING_SLOT_CAP,
  allowsAnotherInstanceOfDef,
  SILO_BUILDING_DEF_ID,
  canPurchaseField,
  countBuildingsOccupyingSlots,
  isPlacementBlockedBySlotCap,
  countPlayerFields,
  iosToRecord,
  isFieldGrowRuleId,
  isFallowActive,
  mergeQty,
  scaleOutputsByYield,
  weatherYieldMult,
  haulGoldForBuilding,
  opsCostsFromDepth,
  wageGoldForBuilding,
  defaultAutoMethodIdForBuilding,
  mapStartFailureToAutoPauseReason,
  sortBuildingsForAfkAutoStart,
  type BuildingQueueJob,
  type BuildingStatus,
  type ItemIo,
} from "@ascent/shared";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { isMethodAllowedForBuilding } from "./building-method-access";
import {
  BUILDING_STATE_CONFLICT_MESSAGE,
  SETTLEMENT_CONFLICT_MESSAGE,
  throwIfStateConflict,
} from "./building-state-update";
import { SettlementMutex } from "./settlement-mutex";
import { loadRetailShelfPublicState, settleRetailShelfUnlocked } from "../market/retail-shelf.settlement";
import {
  type SettlementTransactionClient,
  withSettlementTransaction,
} from "./settlement-db-lock";
import { deductPlayerItem } from "./player-inventory-tx";

function toGameInt(sec: number): bigint {
  return BigInt(Math.max(0, Math.floor(sec)));
}

function fallowUntilForApi(
  fallowUntilGame: bigint | null | undefined,
  currentGameSec: number,
): number | undefined {
  if (fallowUntilGame == null) return undefined;
  const until = Number(fallowUntilGame);
  return isFallowActive(until, currentGameSec) ? until : undefined;
}

function badRequestMessage(e: BadRequestException): string {
  const res = e.getResponse();
  if (typeof res === "string") return res;
  if (typeof res === "object" && res && "message" in res) {
    const m = (res as { message: string | string[] }).message;
    return Array.isArray(m) ? m[0] : m;
  }
  return String(res);
}

function withBuildingEnvironmentFields<
  T extends { fallowUntilGame?: bigint | null },
>(building: T, currentGameSec: number): Omit<T, "fallowUntilGame"> & { fallowUntil?: number } {
  const fallowUntil = fallowUntilForApi(building.fallowUntilGame, currentGameSec);
  const { fallowUntilGame: _omit, ...rest } = building;
  return fallowUntil !== undefined ? { ...rest, fallowUntil } : rest;
}

@Injectable()
export class InventoryService {
  private readonly settlementMutex = new SettlementMutex();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
  ) {}

  /** 與結算／建築寫入共用，避免並發雙花（市集等不直接持 tx 的呼叫方）。 */
  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    return this.settlementMutex.runExclusive(fn);
  }

  /** 僅在已持有 {@link runExclusive} 或內部結算路徑時呼叫。 */
  async settleAllUnlocked(): Promise<void> {
    const now = new Date();
    await withSettlementTransaction(this.prisma, async (tx) => {
      await this.settleAllBuildingsAndAfkAutoStartUnlocked(tx);
      await settleRetailShelfUnlocked(tx, this.sim, now);
    });
  }

  /** AFK-SMART D1：先結算全建築，再按麵包鏈優先序批次嘗試自動開工。 */
  private async settleAllBuildingsAndAfkAutoStartUnlocked(tx: SettlementTransactionClient): Promise<void> {
    const buildings = await tx.playerBuilding.findMany({
      where: { playerId: LOCAL_PLAYER_ID },
    });
    const order = sortBuildingsForAfkAutoStart(buildings);
    for (const b of order) {
      await this.settleBuildingUnlocked(tx, b.id, false);
    }
    for (const b of order) {
      await this.maybeTryAutoStartUnlocked(tx, b.id);
    }
  }

  private withSettlementTx<T>(fn: (tx: SettlementTransactionClient) => Promise<T>): Promise<T> {
    return this.settlementMutex.runExclusive(() => withSettlementTransaction(this.prisma, fn));
  }

  async time() {
    const state = await this.requireState(this.prisma);
    const now = Date.now();
    const startRealTime = state.startRealTime.toISOString();
    const startGameTime = Number(state.startGameTime);
    return {
      startRealTime,
      startGameTime,
      serverRealTime: new Date(now).toISOString(),
      displayGameTime: this.sim.displayGameTime(
        { startRealTimeMs: state.startRealTime.getTime(), startGameTime },
        now,
      ),
      timeScale: this.sim.config.timeScale,
    };
  }

  async state() {
    await this.settleAll();
    const [inventory, buildings, methods, defs, time] = await Promise.all([
      this.prisma.playerInventory.findMany({ where: { playerId: LOCAL_PLAYER_ID }, include: { item: true } }),
      this.prisma.playerBuilding.findMany({
        where: { playerId: LOCAL_PLAYER_ID },
        include: { buildingDef: true, method: true },
      }),
      this.prisma.productionMethod.findMany({ where: { isActive: true } }),
      this.prisma.buildingDef.findMany({ where: { isActive: true } }),
      this.time(),
    ]);
    const workforce = await this.workforceSnapshot();
    const opsCosts = opsCostsFromDepth(this.sim.opsDepth);
    const currentGame = time.displayGameTime;
    const weatherState = await this.sim.ensureWeatherFresh(this.prisma, currentGame);
    const environment = this.sim.environmentSnapshot(weatherState, currentGame);
    const buildingsOut = buildings.map((b) => withBuildingEnvironmentFields(b, currentGame));
    const fieldCount = countPlayerFields(buildings);
    const buildingCount = countBuildingsOccupyingSlots(buildings);
    const shelf = await this.prisma.$transaction((tx) =>
      loadRetailShelfPublicState(tx, this.sim, Date.now()),
    );
    return {
      time,
      inventory,
      buildings: buildingsOut,
      methods,
      buildingDefs: defs,
      workforce,
      opsCosts,
      environment,
      fieldCount,
      fieldCap: FIELD_CAP,
      buildingCount,
      buildingSlotCap: PLAYER_BUILDING_SLOT_CAP,
      retailShelf: {
        enabled: shelf.enabled,
        followMarket: shelf.followMarket,
        ask: shelf.ask,
        todayRevenueGold: shelf.todayRevenueGold,
      },
    };
  }

  async workforceSnapshot() {
    const player = await this.prisma.player.findUniqueOrThrow({ where: { id: LOCAL_PLAYER_ID } });
    const { maxHired } = this.sim.opsDepth.workforce;
    const hired = player.workforceHired;
    const busy = player.workforceBusy;
    return {
      hired,
      busy,
      free: Math.max(0, hired - busy),
      maxHired,
    };
  }

  async inventory() {
    await this.settleAll();
    return this.prisma.playerInventory.findMany({
      where: { playerId: LOCAL_PLAYER_ID },
      include: { item: true },
    });
  }

  async buildings() {
    await this.settleAll();
    return this.prisma.playerBuilding.findMany({
      where: { playerId: LOCAL_PLAYER_ID },
      include: { buildingDef: true, method: true },
    });
  }

  async building(id: string) {
    await this.settleBuilding(id);
    const b = await this.prisma.playerBuilding.findUnique({
      where: { id },
      include: { buildingDef: true, method: true },
    });
    if (!b) throw new NotFoundException("建築不存在");
    return b;
  }

  async place(buildingDefId: string) {
    if (buildingDefId === FIELD_BUILDING_DEF_ID) {
      throw new BadRequestException(LAND_ERROR_COPY.FIELD_USE_PURCHASE_API);
    }
    if (buildingDefId === SILO_BUILDING_DEF_ID) {
      throw new BadRequestException(LAND_ERROR_COPY.SILO_PLACEMENT_FORBIDDEN);
    }
    const def = await this.prisma.buildingDef.findFirst({ where: { id: buildingDefId, isActive: true } });
    if (!def) throw new BadRequestException("未知建築");

    return this.runExclusive(async () => {
      await this.settleAllUnlocked();
      const now = new Date();
      const clock = await this.requireState(this.prisma);
      const game = this.sim.displayGameTime(
        { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
        now.getTime(),
      );

      let created: Awaited<ReturnType<typeof this.prisma.playerBuilding.create>>;
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.playerBuilding.findMany({
          where: { playerId: LOCAL_PLAYER_ID },
          select: { buildingDefId: true },
        });
        this.assertPlacementAllowed(def.id, existing);
        created = await tx.playerBuilding.create({
          data: this.newPlayerBuildingData(def.id, game, now),
        });
      });
      return created!;
    });
  }

  async purchaseField() {
    return this.runExclusive(async () => {
      await this.settleAllUnlocked();
      const now = new Date();
      const clock = await this.requireState(this.prisma);
      const game = this.sim.displayGameTime(
        { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
        now.getTime(),
      );

      const def = await this.prisma.buildingDef.findFirst({
        where: { id: FIELD_BUILDING_DEF_ID, isActive: true },
      });
      if (!def) throw new BadRequestException("未知建築");

      let created: Awaited<ReturnType<typeof this.prisma.playerBuilding.create>>;
      let goldAfter = 0;
      let pricePaid = 0;

      await this.prisma.$transaction(async (tx) => {
        const buildings = await tx.playerBuilding.findMany({
          where: { playerId: LOCAL_PLAYER_ID },
          select: { buildingDefId: true },
        });
        const fieldCount = countPlayerFields(buildings);
        const slottedBuildingCount = countBuildingsOccupyingSlots(buildings);
        const gate = canPurchaseField({ fieldCount, slottedBuildingCount });
        if (!gate.ok) {
          throw new BadRequestException(LAND_ERROR_COPY[gate.reason]);
        }
        pricePaid = gate.priceGold;
        await deductPlayerItem(tx, ITEM_GOLD_ID, gate.priceGold, LAND_ERROR_COPY.INSUFFICIENT_GOLD);
        created = await tx.playerBuilding.create({
          data: this.newPlayerBuildingData(FIELD_BUILDING_DEF_ID, game, now),
        });
        const goldRow = await tx.playerInventory.findUnique({
          where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
        });
        goldAfter = Number(goldRow?.quantity ?? 0);
      });

      return { building: created!, gold: goldAfter, pricePaid };
    });
  }

  private assertPlacementAllowed(
    buildingDefId: string,
    existing: { buildingDefId: string }[],
  ): void {
    if (isPlacementBlockedBySlotCap(buildingDefId, existing)) {
      throw new BadRequestException(LAND_ERROR_COPY.BUILDING_SLOTS_FULL);
    }
    const sameDef = existing.filter((b) => b.buildingDefId === buildingDefId).length;
    if (!allowsAnotherInstanceOfDef(buildingDefId, sameDef)) {
      throw new BadRequestException(
        buildingDefId === FIELD_BUILDING_DEF_ID
          ? LAND_ERROR_COPY.FIELD_AT_CAP
          : LAND_ERROR_COPY.DUPLICATE_BUILDING_DEF,
      );
    }
  }

  private newPlayerBuildingData(buildingDefId: string, game: number, now: Date) {
    return {
      id: `pb_${LOCAL_PLAYER_ID}_${buildingDefId}_${now.getTime()}`,
      playerId: LOCAL_PLAYER_ID,
      buildingDefId,
      lastSettledAt: now,
      lastSettledGame: toGameInt(game),
      lastUpdate: now,
      lastUpdateGame: toGameInt(game),
      queue: [],
      inputs: {},
      outputs: {},
      bufferedOutputs: {},
      status: "idle" as const,
    };
  }

  async start(buildingId: string, methodId: string) {
    return this.withSettlementTx(async (tx) => {
      await this.settleBuildingUnlocked(tx, buildingId);
      await this.executeStartInTx(tx, buildingId, methodId);
      return tx.playerBuilding.findUniqueOrThrow({
        where: { id: buildingId },
        include: { buildingDef: true, method: true },
      });
    });
  }

  async patchBuildingAuto(
    buildingId: string,
    body: { autoEnabled?: boolean; autoMethodId?: string | null },
  ) {
    if (body.autoEnabled !== undefined && typeof body.autoEnabled !== "boolean") {
      throw new BadRequestException("autoEnabled 必須為布林值");
    }
    if (
      body.autoMethodId !== undefined &&
      body.autoMethodId !== null &&
      typeof body.autoMethodId !== "string"
    ) {
      throw new BadRequestException("autoMethodId 必須為字串或 null");
    }
    return this.withSettlementTx(async (tx) => {
      await this.settleBuildingUnlocked(tx, buildingId);
      const building = await tx.playerBuilding.findUnique({
        where: { id: buildingId },
        include: { buildingDef: true },
      });
      if (!building) throw new NotFoundException("建築不存在");

      if (body.autoMethodId !== undefined && body.autoMethodId !== null) {
        const method = await tx.productionMethod.findFirst({
          where: { id: body.autoMethodId, isActive: true },
        });
        if (!method) throw new BadRequestException("未知生產方式");
        const allowed = (building.buildingDef.allowedRuleIds as string[]) ?? [];
        if (!isMethodAllowedForBuilding(allowed, method.ruleId)) {
          throw new BadRequestException("此建築不能使用該方式");
        }
      }

      const autoEnabled = body.autoEnabled ?? building.autoEnabled;
      await tx.playerBuilding.update({
        where: { id: buildingId },
        data: {
          autoEnabled,
          autoPauseReason: autoEnabled ? building.autoPauseReason : null,
          ...(body.autoMethodId !== undefined ? { autoMethodId: body.autoMethodId } : {}),
        },
      });
      if (autoEnabled) {
        await this.maybeTryAutoStartUnlocked(tx, buildingId);
      }
      return tx.playerBuilding.findUniqueOrThrow({
        where: { id: buildingId },
        include: { buildingDef: true, method: true },
      });
    });
  }

  /** @deprecated 使用 {@link patchBuildingAuto} */
  async setAutoEnabled(buildingId: string, autoEnabled: boolean) {
    return this.patchBuildingAuto(buildingId, { autoEnabled });
  }

  private async executeStartInTx(
    tx: SettlementTransactionClient,
    buildingId: string,
    methodId: string,
  ): Promise<void> {
    const building = await tx.playerBuilding.findUnique({
      where: { id: buildingId },
      include: { buildingDef: true },
    });
    if (!building) throw new NotFoundException("建築不存在");
    if (building.status !== "idle") throw new BadRequestException("建築忙碌或待收取");
    const method = await tx.productionMethod.findFirst({ where: { id: methodId, isActive: true } });
    if (!method) throw new BadRequestException("未知生產方式");
    const allowed = (building.buildingDef.allowedRuleIds as string[]) ?? [];
    if (!isMethodAllowedForBuilding(allowed, method.ruleId)) {
      throw new BadRequestException("此建築不能使用該方式");
    }
    const now = new Date();
    const clock = await this.requireState(tx);
    const game = this.sim.displayGameTime(
      { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
      now.getTime(),
    );
    if (
      building.buildingDefId === "bdef_field" &&
      isFieldGrowRuleId(method.ruleId) &&
      isFallowActive(
        building.fallowUntilGame != null ? Number(building.fallowUntilGame) : null,
        game,
      )
    ) {
      throw new BadRequestException("土地休耕中");
    }
    const inputs = iosToRecord(method.inputs as ItemIo[]);
    const outputs = iosToRecord(method.outputs as ItemIo[]);
    const depth = this.sim.opsDepth;
    const laborCost = depth.workforce.laborCostPerStart;
    const wageGold = wageGoldForBuilding(building.buildingDefId, depth);
    const haulGold = haulGoldForBuilding(building.buildingDefId, depth);
    const player = await tx.player.findUniqueOrThrow({ where: { id: LOCAL_PLAYER_ID } });
    const free = player.workforceHired - player.workforceBusy;
    if (free < laborCost) throw new BadRequestException("人手不足");
    for (const [itemId, qty] of Object.entries(inputs)) {
      const row = await tx.playerInventory.findUnique({
        where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
      });
      const have = row ? Number(row.quantity) : 0;
      if (have + 1e-9 < qty) throw new BadRequestException(`資源不足：${itemId}`);
    }
    const goldCost = wageGold + haulGold;
    if (goldCost > 0) {
      const goldRow = await tx.playerInventory.findUnique({
        where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_GOLD_ID } },
      });
      const goldHave = goldRow ? Number(goldRow.quantity) : 0;
      if (goldHave + 1e-9 < goldCost) throw new BadRequestException("金幣不足");
    }
    const job: BuildingQueueJob = {
      methodId: method.id,
      durationGameSec: method.durationGameSec,
      elapsedGameSec: 0,
      inputs,
      outputs,
    };
    const started = await tx.playerBuilding.updateMany({
      where: { id: buildingId, status: "idle" },
      data: {
        methodId: method.id,
        status: "running",
        queue: [job] as unknown as Prisma.InputJsonValue,
        inputs,
        outputs,
        lastSettledAt: now,
        lastSettledGame: toGameInt(game),
        lastUpdate: now,
        lastUpdateGame: toGameInt(game),
      },
    });
    throwIfStateConflict(started.count);
    for (const [itemId, qty] of Object.entries(inputs)) {
      await tx.playerInventory.update({
        where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
        data: { quantity: { decrement: qty } },
      });
    }
    if (wageGold > 0) {
      await deductPlayerItem(tx, ITEM_GOLD_ID, wageGold);
    }
    if (haulGold > 0) {
      await deductPlayerItem(tx, ITEM_GOLD_ID, haulGold);
    }
    await tx.player.update({
      where: { id: LOCAL_PLAYER_ID },
      data: { workforceBusy: { increment: laborCost } },
    });
  }

  /** AFK-D4：每 tick 每建築最多試一次；重用 executeStartInTx 閘門。 */
  private async maybeTryAutoStartUnlocked(tx: SettlementTransactionClient, buildingId: string) {
    const building = await tx.playerBuilding.findUnique({
      where: { id: buildingId },
      include: { buildingDef: true },
    });
    if (!building?.autoEnabled || building.status !== "idle") return;
    const methodId =
      building.autoMethodId ?? defaultAutoMethodIdForBuilding(building.buildingDefId);
    if (!methodId) return;
    try {
      await this.executeStartInTx(tx, buildingId, methodId);
      await tx.playerBuilding.update({
        where: { id: buildingId },
        data: { autoPauseReason: null },
      });
    } catch (e) {
      if (e instanceof BadRequestException) {
        const reason = mapStartFailureToAutoPauseReason(badRequestMessage(e));
        if (reason) {
          await tx.playerBuilding.update({
            where: { id: buildingId },
            data: { autoPauseReason: reason },
          });
        }
        return;
      }
      throw e;
    }
  }

  async stop(buildingId: string) {
    return this.withSettlementTx(async (tx) => {
      await this.settleBuildingUnlocked(tx, buildingId);
      const building = await tx.playerBuilding.findUnique({ where: { id: buildingId } });
      if (!building) throw new NotFoundException("建築不存在");
      const now = new Date();
      const clock = await this.requireState(tx);
      const game = this.sim.displayGameTime(
        { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
        now.getTime(),
      );
      const expectedStatus = building.status;
      const releaseWorkforce = building.status === "running";
      const laborCost = this.sim.opsDepth.workforce.laborCostPerStart;
      const stopped = await tx.playerBuilding.updateMany({
        where: { id: buildingId, status: expectedStatus },
        data: {
          status: building.status === "ready" ? "ready" : "idle",
          methodId: building.status === "ready" ? building.methodId : null,
          queue: (building.status === "ready" ? building.queue : []) as Prisma.InputJsonValue,
          lastSettledAt: now,
          lastSettledGame: toGameInt(game),
          lastUpdate: now,
          lastUpdateGame: toGameInt(game),
        },
      });
      throwIfStateConflict(stopped.count);
      if (releaseWorkforce) {
        const player = await tx.player.findUniqueOrThrow({ where: { id: LOCAL_PLAYER_ID } });
        const nextBusy = Math.max(0, player.workforceBusy - laborCost);
        if (nextBusy !== player.workforceBusy) {
          await tx.player.update({
            where: { id: LOCAL_PLAYER_ID },
            data: { workforceBusy: nextBusy },
          });
        }
      }
      return tx.playerBuilding.findUniqueOrThrow({
        where: { id: buildingId },
        include: { buildingDef: true, method: true },
      });
    });
  }

  async collect(buildingId: string) {
    return this.withSettlementTx(async (tx) => {
      await this.settleBuildingUnlocked(tx, buildingId);
      const building = await tx.playerBuilding.findUnique({
        where: { id: buildingId },
        include: { method: true },
      });
      if (!building) throw new NotFoundException("建築不存在");
      const buffered =
        building.status === "ready"
          ? ((building.bufferedOutputs as Record<string, number>) ?? {})
          : {};
      const now = new Date();
      const clock = await this.requireState(tx);
      const game = this.sim.displayGameTime(
        { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
        now.getTime(),
      );
      let fallowUntilGame: bigint | null = building.fallowUntilGame;
      if (
        building.buildingDefId === "bdef_field" &&
        building.method?.ruleId &&
        isFieldGrowRuleId(building.method.ruleId)
      ) {
        fallowUntilGame = toGameInt(game + this.sim.environmentConfig.fallowDurationGameSec);
      }
      const claimed = await tx.playerBuilding.updateMany({
        where: { id: buildingId, status: "ready" },
        data: {
          status: "idle",
          methodId: null,
          queue: [],
          bufferedOutputs: {},
          fallowUntilGame,
          lastSettledAt: now,
          lastSettledGame: toGameInt(game),
          lastUpdate: now,
          lastUpdateGame: toGameInt(game),
        },
      });
      throwIfStateConflict(claimed.count);
      const laborCost = this.sim.opsDepth.workforce.laborCostPerStart;
      const player = await tx.player.findUniqueOrThrow({ where: { id: LOCAL_PLAYER_ID } });
      const nextBusy = Math.max(0, player.workforceBusy - laborCost);
      if (nextBusy !== player.workforceBusy) {
        await tx.player.update({
          where: { id: LOCAL_PLAYER_ID },
          data: { workforceBusy: nextBusy },
        });
      }
      await this.add(tx, buffered);
      await this.maybeTryAutoStartUnlocked(tx, buildingId);
      return tx.playerBuilding.findUniqueOrThrow({
        where: { id: buildingId },
        include: { buildingDef: true, method: true },
      });
    });
  }

  async settleAll() {
    const now = new Date();
    return this.withSettlementTx(async (tx) => {
      await this.settleAllBuildingsAndAfkAutoStartUnlocked(tx);
      await settleRetailShelfUnlocked(tx, this.sim, now);
    });
  }

  async settleBuilding(id: string) {
    return this.withSettlementTx((tx) => this.settleBuildingUnlocked(tx, id));
  }

  private async settleBuildingUnlocked(
    tx: SettlementTransactionClient,
    id: string,
    tryAutoStart = true,
  ) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const building = await tx.playerBuilding.findUnique({ where: { id } });
      if (!building) return;

      const now = new Date();
      const lastSettledAt = building.lastSettledAt;
      const clock = await this.requireState(tx);
      const window = this.sim.settleWindow(lastSettledAt.getTime(), now.getTime());
      const queue = (building.queue as unknown as BuildingQueueJob[]) ?? [];
      const result = this.sim.settleProduction(building.status as BuildingStatus, queue, window.gameDeltaSec);
      const game = this.sim.displayGameTime(
        { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
        now.getTime(),
      );
      const weatherState = await this.sim.ensureWeatherFresh(tx, game);
      const yieldMult = weatherYieldMult(this.sim.environmentConfig, weatherState.weather);
      let completedOutputs = result.completedOutputs;
      if (Object.keys(completedOutputs).length > 0 && building.buildingDefId === "bdef_field") {
        const job = queue[0];
        if (job?.methodId) {
          const method = await tx.productionMethod.findUnique({ where: { id: job.methodId } });
          if (method && isFieldGrowRuleId(method.ruleId)) {
            completedOutputs = scaleOutputsByYield(completedOutputs, yieldMult);
          }
        }
      }
      const prevBuffered = (building.bufferedOutputs as Record<string, number>) ?? {};
      const buffered = mergeQty(prevBuffered, completedOutputs);

      const updated = await tx.playerBuilding.updateMany({
        where: { id, lastSettledAt },
        data: {
          status: result.status,
          queue: result.queue as unknown as Prisma.InputJsonValue,
          bufferedOutputs: buffered,
          lastSettledAt: now,
          lastSettledGame: toGameInt(game),
          lastUpdate: now,
          lastUpdateGame: toGameInt(game),
        },
      });
      if (updated.count === 1) {
        await tx.serverState.update({
          where: { id: 1 },
          data: { lastUpdate: now },
        });
        if (tryAutoStart && result.status === "idle") {
          await this.maybeTryAutoStartUnlocked(tx, id);
        }
        return;
      }
    }
    throwIfStateConflict(0, SETTLEMENT_CONFLICT_MESSAGE);
  }

  private async add(tx: SettlementTransactionClient, gain: Record<string, number>) {
    for (const [itemId, qty] of Object.entries(gain)) {
      await tx.playerInventory.upsert({
        where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
        update: { quantity: { increment: qty } },
        create: { playerId: LOCAL_PLAYER_ID, itemId, quantity: qty },
      });
    }
  }

  private async requireState(tx: Pick<PrismaService, "serverState">) {
    const state = await tx.serverState.findUnique({ where: { id: 1 } });
    if (!state) throw new BadRequestException("尚未種子世界時鐘");
    return state;
  }
}
