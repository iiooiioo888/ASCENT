import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";
import { InventoryService } from "./inventory.service";

@Controller("api/v1")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("time")
  time() {
    return this.inventory.time();
  }

  @Get("state")
  state() {
    return this.inventory.state();
  }

  @Get("inventory")
  inventoryList() {
    return this.inventory.inventory();
  }

  @Get("buildings")
  buildings() {
    return this.inventory.buildings();
  }

  @Get("buildings/:id")
  building(@Param("id") id: string) {
    return this.inventory.building(id);
  }

  @Post("buildings")
  place(@Body() body: { buildingDefId: string }) {
    return this.inventory.place(body.buildingDefId);
  }

  @Post("buildings/purchase-field")
  purchaseField() {
    return this.inventory.purchaseField();
  }

  @Post("buildings/:id/start")
  start(@Param("id") id: string, @Body() body: { methodId: string }) {
    return this.inventory.start(id, body.methodId);
  }

  @Post("buildings/:id/stop")
  stop(@Param("id") id: string) {
    return this.inventory.stop(id);
  }

  @Post("buildings/:id/collect")
  @HttpCode(HttpStatus.OK)
  collect(@Param("id") id: string) {
    return this.inventory.collect(id);
  }

  @Post("buildings/:id/repair")
  @HttpCode(HttpStatus.OK)
  repair(@Param("id") id: string) {
    return this.inventory.repair(id);
  }

  @Patch("buildings/:id/auto")
  setAuto(
    @Param("id") id: string,
    @Body() body: { autoEnabled?: boolean; autoMethodId?: string | null },
  ) {
    return this.inventory.patchBuildingAuto(id, body);
  }

  @Patch("buildings/:id/cultivation")
  setCultivation(@Param("id") id: string, @Body() body: { mode?: string }) {
    return this.inventory.patchCultivation(id, body.mode);
  }
}
