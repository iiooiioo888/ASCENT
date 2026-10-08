import {
  ITEM_SETTLEMENT_CURRENCY_ID,
  RETAIL_SKU_ID,
  gameDayIndex,
  resolveShelfAskGold,
  rollShelfSaleQty,
  shelfTicksElapsed,
  type RetailShelfPublicState,
} from "@ascent/shared";
import { currentPlayerId } from "../auth/player-context";
import type { SimulationService } from "../simulation/simulation.service";
import type { SettlementTransactionClient } from "../inventory/settlement-db-lock";
import { creditPlayerItem, deductPlayerItem } from "../inventory/player-inventory-tx";

export type RetailShelfRng = () => number;

function syncRevenueForGameDay(
  displayGameTimeSec: number,
  gameDayGameSec: number,
  storedDay: number | null,
  storedRevenue: number,
): { gameDay: number; todayRevenueGold: number } {
  const day = gameDayIndex(displayGameTimeSec, gameDayGameSec);
  if (storedDay === null || storedDay !== day) {
    return { gameDay: day, todayRevenueGold: 0 };
  }
  return { gameDay: day, todayRevenueGold: storedRevenue };
}

export function shelfPublicStateFromRow(
  row: {
    shelfEnabled: boolean;
    shelfFollowMarket: boolean;
    shelfAskGold: number | null;
    shelfTodayRevenueGold: number;
    shelfRevenueGameDay: number | null;
  },
  ask: number,
  todayRevenueGold: number,
): RetailShelfPublicState {
  return {
    enabled: row.shelfEnabled,
    followMarket: row.shelfFollowMarket,
    ask,
    todayRevenueGold,
    skuId: RETAIL_SKU_ID,
  };
}

/** 懶結算／背景 tick：依真實時間推進貨架售出；不佔工位、無運費。 */
export async function settleRetailShelfUnlocked(
  tx: SettlementTransactionClient,
  sim: SimulationService,
  now: Date,
  rnd: RetailShelfRng = Math.random,
): Promise<void> {
  const clock = await tx.serverState.findUnique({ where: { id: 1 } });
  if (!clock) return;

  const displayGameTime = sim.displayGameTime(
    { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
    now.getTime(),
  );
  const gameDay = gameDayIndex(displayGameTime, sim.config.gameDayGameSec);

  let row = await tx.playerRetailState.findUnique({ where: { playerId: currentPlayerId() } });
  if (!row) {
    row = await tx.playerRetailState.create({
      data: {
        playerId: currentPlayerId(),
        shelfLastTickAt: now,
        shelfRevenueGameDay: gameDay,
      },
    });
    return;
  }

  const revenueSync = syncRevenueForGameDay(
    displayGameTime,
    sim.config.gameDayGameSec,
    row.shelfRevenueGameDay,
    row.shelfTodayRevenueGold,
  );
  let todayRevenue = revenueSync.todayRevenueGold;
  let revenueGameDay = revenueSync.gameDay;

  if (!row.shelfLastTickAt) {
    await tx.playerRetailState.update({
      where: { playerId: currentPlayerId() },
      data: {
        shelfLastTickAt: now,
        shelfRevenueGameDay: revenueGameDay,
        shelfTodayRevenueGold: todayRevenue,
      },
    });
    return;
  }

  const lastTickMs = row.shelfLastTickAt.getTime();
  const tickCount = shelfTicksElapsed(
    lastTickMs,
    now.getTime(),
    sim.config.tickIntervalRealMs,
    sim.config.maxOfflineRealSec,
  );

  if (tickCount < 1) {
    if (
      revenueGameDay !== row.shelfRevenueGameDay ||
      todayRevenue !== row.shelfTodayRevenueGold
    ) {
      await tx.playerRetailState.update({
        where: { playerId: currentPlayerId() },
        data: {
          shelfRevenueGameDay: revenueGameDay,
          shelfTodayRevenueGold: todayRevenue,
        },
      });
    }
    return;
  }

  let breadRow = await tx.playerInventory.findUnique({
    where: { playerId_itemId: { playerId: currentPlayerId(), itemId: RETAIL_SKU_ID } },
  });
  let breadQty = breadRow ? Number(breadRow.quantity) : 0;

  for (let i = 0; i < tickCount; i++) {
    if (!row.shelfEnabled || breadQty < 1) continue;
    const tickAsk = resolveShelfAskGold(
      row.shelfAskGold,
      row.shelfFollowMarket,
      sim.marketPriceBook,
      sim.retailConfig,
    );
    const qty = rollShelfSaleQty(breadQty, rnd);
    if (qty < 1) continue;
    const gold = tickAsk * qty;
    await deductPlayerItem(tx, RETAIL_SKU_ID, qty);
    await creditPlayerItem(tx, ITEM_SETTLEMENT_CURRENCY_ID, gold);
    breadQty -= qty;
    todayRevenue += gold;
  }

  const nextLastTick = new Date(lastTickMs + tickCount * sim.config.tickIntervalRealMs);
  await tx.playerRetailState.update({
    where: { playerId: currentPlayerId() },
    data: {
      shelfLastTickAt: nextLastTick,
      shelfRevenueGameDay: revenueGameDay,
      shelfTodayRevenueGold: todayRevenue,
    },
  });
}

export async function loadRetailShelfPublicState(
  tx: SettlementTransactionClient,
  sim: SimulationService,
  nowMs: number,
): Promise<RetailShelfPublicState> {
  const clock = await tx.serverState.findUnique({ where: { id: 1 } });
  const displayGameTime =
    clock === null
      ? 0
      : sim.displayGameTime(
          { startRealTimeMs: clock.startRealTime.getTime(), startGameTime: Number(clock.startGameTime) },
          nowMs,
        );
  const row = await tx.playerRetailState.findUnique({ where: { playerId: currentPlayerId() } });
  if (!row) {
    const ask = resolveShelfAskGold(null, true, sim.marketPriceBook, sim.retailConfig);
    return { enabled: false, followMarket: true, ask, todayRevenueGold: 0, skuId: RETAIL_SKU_ID };
  }
  const revenueSync = syncRevenueForGameDay(
    displayGameTime,
    sim.config.gameDayGameSec,
    row.shelfRevenueGameDay,
    row.shelfTodayRevenueGold,
  );
  const ask = resolveShelfAskGold(
    row.shelfAskGold,
    row.shelfFollowMarket,
    sim.marketPriceBook,
    sim.retailConfig,
  );
  return shelfPublicStateFromRow(row, ask, revenueSync.todayRevenueGold);
}
