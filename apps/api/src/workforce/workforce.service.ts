import { BadRequestException, Injectable } from "@nestjs/common";
import { ITEM_SETTLEMENT_CURRENCY_ID, LOCAL_PLAYER_ID } from "@ascent/shared";
import { PrismaService } from "../prisma/prisma.service";
import { SimulationService } from "../simulation/simulation.service";
import { InventoryService } from "../inventory/inventory.service";
import { deductPlayerItem } from "../inventory/player-inventory-tx";

@Injectable()
export class WorkforceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
    private readonly inventory: InventoryService,
  ) {}

  async hire() {
    return this.inventory.runExclusive(async () => {
      await this.inventory.settleAllUnlocked();
      const depth = this.sim.opsDepth;
      const { maxHired, hireCostGold } = depth.workforce;

      await this.prisma.$transaction(async (tx) => {
        const player = await tx.player.findUniqueOrThrow({ where: { id: LOCAL_PLAYER_ID } });
        if (player.workforceHired >= maxHired) {
          throw new BadRequestException("已達僱工上限");
        }
        await deductPlayerItem(tx, ITEM_SETTLEMENT_CURRENCY_ID, hireCostGold);
        await tx.player.update({
          where: { id: LOCAL_PLAYER_ID },
          data: { workforceHired: { increment: 1 } },
        });
      });

      const workforce = await this.inventory.workforceSnapshot();
      const goldRow = await this.prisma.playerInventory.findUnique({
        where: { playerId_itemId: { playerId: LOCAL_PLAYER_ID, itemId: ITEM_SETTLEMENT_CURRENCY_ID } },
      });
      return {
        workforce,
        gold: Number(goldRow?.quantity ?? 0),
        settlementCurrencyItemId: ITEM_SETTLEMENT_CURRENCY_ID,
      };
    });
  }
}
