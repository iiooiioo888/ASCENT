import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  LOCAL_PLAYER_ID,
  iosToRecord,
  mergeQty,
  type BuildingQueueJob,
  type BuildingStatus,
  type ItemIo,
} from "@ascent/shared";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { isMethodAllowedForBuilding } from "./building-method-access";
import {
  BUILDING_STATE_CONFLICT_MESSAGE,
  SETTLEMENT_CONFLICT_MESSAGE,
  throwIfStateConflict,
} from "./building-state-update";
import { SettlementMutex } from "./settlement-mutex";

function toGameInt(sec: number): bigint {
  return BigInt(Math.max(0, Math.floor(sec)));
}

@Injectable()
export class InventoryService {
  private readonly settlementMutex = new SettlementMutex();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
  ) {}

  /** 與結算／建築寫入共用，避免並發雙花。 */
  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    return this.settlementMutex.runExclusive(fn);
  }

  async time() {
    const state = await this.requireState();
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
    return { time, inventory, buildings, methods, buildingDefs: defs };
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
    const def = await this.prisma.buildingDef.findFirst({ where: { id: buildingDefId, isActive: true } });
    if (!def) throw new BadRequestException("未知建築");
    const now = new Date();
    const clock = await this.requireState();
    const game = this.sim.displayGameTime(
      { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
      now.getTime(),
    );
    return this.prisma.playerBuilding.create({
      data: {
        id: `pb_${LOCAL_PLAYER_ID}_${def.id}_${now.getTime()}`,
        playerId: LOCAL_PLAYER_ID,
        buildingDefId: def.id,
        lastSettledAt: now,
        lastSettledGame: toGameInt(game),
        lastUpdate: now,
        lastUpdateGame: toGameInt(game),
        queue: [],
        inputs: {},
        outputs: {},
        bufferedOutputs: {},
        status: "idle",
      },
    });
  }

  async start(buildingId: string, methodId: string) {
    return this.runExclusive(async () => {
      await this.settleBuildingUnlocked(buildingId);
      const building = await this.prisma.playerBuilding.findUnique({
        where: { id: buildingId },
        include: { buildingDef: true },
      });
      if (!building) throw new NotFoundException("建築不存在");
      if (building.status !== "idle") throw new BadRequestException("建築忙碌或待收取");
      const method = await this.prisma.productionMethod.findFirst({ where: { id: methodId, isActive: true } });
      if (!method) throw new BadRequestException("未知生產方式");
      const allowed = (building.buildingDef.allowedRuleIds as string[]) ?? [];
      if (!isMethodAllowedForBuilding(allowed, method.ruleId)) {
        throw new BadRequestException("此建築不能使用該方式");
      }
      const inputs = iosToRecord(method.inputs as ItemIo[]);
      const outputs = iosToRecord(method.outputs as ItemIo[]);
      await this.prisma.$transaction(async (tx) => {
        for (const [itemId, qty] of Object.entries(inputs)) {
          const row = await tx.playerInventory.findUnique({
            where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
          });
          const have = row ? Number(row.quantity) : 0;
          if (have + 1e-9 < qty) throw new BadRequestException(`資源不足：${itemId}`);
        }
        for (const [itemId, qty] of Object.entries(inputs)) {
          await tx.playerInventory.update({
            where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
            data: { quantity: { decrement: qty } },
          });
        }
      });
      const job: BuildingQueueJob = {
        methodId: method.id,
        durationGameSec: method.durationGameSec,
        elapsedGameSec: 0,
        inputs,
        outputs,
      };
      const now = new Date();
      const clock = await this.requireState();
      const game = this.sim.displayGameTime(
        { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
        now.getTime(),
      );
      const started = await this.prisma.playerBuilding.updateMany({
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
      return this.prisma.playerBuilding.findUniqueOrThrow({
        where: { id: buildingId },
        include: { buildingDef: true, method: true },
      });
    });
  }

  async stop(buildingId: string) {
    return this.runExclusive(async () => {
      await this.settleBuildingUnlocked(buildingId);
      const building = await this.prisma.playerBuilding.findUnique({ where: { id: buildingId } });
      if (!building) throw new NotFoundException("建築不存在");
      const now = new Date();
      const clock = await this.requireState();
      const game = this.sim.displayGameTime(
        { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
        now.getTime(),
      );
      const expectedStatus = building.status;
      const stopped = await this.prisma.playerBuilding.updateMany({
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
      return this.prisma.playerBuilding.findUniqueOrThrow({
        where: { id: buildingId },
        include: { buildingDef: true, method: true },
      });
    });
  }

  async collect(buildingId: string) {
    return this.runExclusive(async () => {
      await this.settleBuildingUnlocked(buildingId);
      const building = await this.prisma.playerBuilding.findUnique({ where: { id: buildingId } });
      if (!building) throw new NotFoundException("建築不存在");
      if (building.status !== "ready") throw new BadRequestException("尚無可收取產出");
      const buffered = (building.bufferedOutputs as Record<string, number>) ?? {};
      const now = new Date();
      const clock = await this.requireState();
      const game = this.sim.displayGameTime(
        { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
        now.getTime(),
      );
      const claimed = await this.prisma.playerBuilding.updateMany({
        where: { id: buildingId, status: "ready" },
        data: {
          status: "idle",
          methodId: null,
          queue: [],
          bufferedOutputs: {},
          lastSettledAt: now,
          lastSettledGame: toGameInt(game),
          lastUpdate: now,
          lastUpdateGame: toGameInt(game),
        },
      });
      throwIfStateConflict(claimed.count);
      await this.add(buffered);
      return this.prisma.playerBuilding.findUniqueOrThrow({
        where: { id: buildingId },
        include: { buildingDef: true, method: true },
      });
    });
  }

  async settleAll() {
    return this.runExclusive(() => this.settleAllUnlocked());
  }

  /** 僅在已持有 {@link runExclusive} 時呼叫（例如市集交易）。 */
  async settleAllUnlocked() {
    const buildings = await this.prisma.playerBuilding.findMany({
      where: { playerId: LOCAL_PLAYER_ID },
    });
    for (const b of buildings) {
      await this.settleBuildingUnlocked(b.id);
    }
  }

  async settleBuilding(id: string) {
    return this.runExclusive(() => this.settleBuildingUnlocked(id));
  }

  private async settleBuildingUnlocked(id: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const building = await this.prisma.playerBuilding.findUnique({ where: { id } });
      if (!building) return;

      const now = new Date();
      const lastSettledAt = building.lastSettledAt;
      const clock = await this.requireState();
      const window = this.sim.settleWindow(lastSettledAt.getTime(), now.getTime());
      const queue = (building.queue as unknown as BuildingQueueJob[]) ?? [];
      const result = this.sim.settleProduction(building.status as BuildingStatus, queue, window.gameDeltaSec);
      const game = this.sim.displayGameTime(
        { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
        now.getTime(),
      );
      const prevBuffered = (building.bufferedOutputs as Record<string, number>) ?? {};
      const buffered = mergeQty(prevBuffered, result.completedOutputs);

      const updated = await this.prisma.playerBuilding.updateMany({
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
        await this.prisma.serverState.update({
          where: { id: 1 },
          data: { lastUpdate: now },
        });
        return;
      }
    }
    throwIfStateConflict(0, SETTLEMENT_CONFLICT_MESSAGE);
  }

  private async add(gain: Record<string, number>) {
    for (const [itemId, qty] of Object.entries(gain)) {
      await this.prisma.playerInventory.upsert({
        where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId } },
        update: { quantity: { increment: qty } },
        create: { playerId: LOCAL_PLAYER_ID, itemId, quantity: qty },
      });
    }
  }

  private async requireState() {
    const state = await this.prisma.serverState.findUnique({ where: { id: 1 } });
    if (!state) throw new BadRequestException("尚未種子世界時鐘");
    return state;
  }
}
