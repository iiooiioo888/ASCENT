import { PrismaClient } from "../generated/prisma/client";
import { createPrismaAdapter } from "../src/prisma/create-prisma-adapter";
import {
  DEFAULT_MARKET_PRICES,
  EQUITY_CONFIG,
  LOCAL_PLAYER_ID,
  seedPriceHistoryAtBase,
  MAX_OFFLINE_GAME_SEC,
  MAX_OFFLINE_REAL_SEC,
  TIME_SCALE,
  TICK_INTERVAL_REAL_MS,
  GAME_DAY_GAME_SEC,
  enabledCommodityListings,
  initialPriceHistory,
} from "@ascent/shared";
import { provisionNewPlayer } from "../src/auth/provision-player";
import { syncCatalog } from "./sync-catalog";

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main() {
  const now = new Date();

  await prisma.playerBuilding.deleteMany();
  await prisma.playerInventory.deleteMany();
  await prisma.playerEquityHolding.deleteMany();
  await prisma.playerRetailState.deleteMany();
  await prisma.playerNpcOrder.deleteMany();
  await prisma.playerNpcOrderScan.deleteMany();
  await prisma.account.deleteMany();
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
  await prisma.commodityMarketState.deleteMany();
  await prisma.equityTickerState.deleteMany();

  await prisma.gameConfig.create({
    data: {
      id: 1,
      timeScale: TIME_SCALE,
      gameDayGameSec: GAME_DAY_GAME_SEC,
      maxOfflineRealSec: MAX_OFFLINE_REAL_SEC,
      maxOfflineGameSec: MAX_OFFLINE_GAME_SEC,
      tickIntervalRealMs: TICK_INTERVAL_REAL_MS,
      marketPrices: DEFAULT_MARKET_PRICES,
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

  await syncCatalog(prisma);

  await provisionNewPlayer(prisma, LOCAL_PLAYER_ID, now);

  const seedNowMs = now.getTime();
  for (const listing of enabledCommodityListings()) {
    await prisma.commodityMarketState.create({
      data: {
        commodityId: listing.id,
        netPressureVolume: 0,
        priceHistory: initialPriceHistory(listing.basePrice, seedNowMs),
      },
    });
  }

  for (const listing of EQUITY_CONFIG.listings) {
    const history = seedPriceHistoryAtBase(listing.basePrice, seedNowMs);
    await prisma.equityTickerState.create({
      data: {
        equityId: listing.id,
        netBuyVolume: 0,
        currentPrice: listing.basePrice,
        priceHistory: history,
      },
    });
  }

  console.log("[seed] 種子完成");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
