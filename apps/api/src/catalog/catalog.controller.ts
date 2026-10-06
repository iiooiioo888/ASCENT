import { Controller, Get, Param, Query } from "@nestjs/common";
import { CatalogService } from "./catalog.service";

@Controller("api/v1")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("item-types")
  itemTypes() {
    return this.catalog.itemTypes();
  }

  @Get("item-properties")
  itemProperties() {
    return this.catalog.itemProperties();
  }

  @Get("items")
  items(
    @Query("layer") layer?: string,
    @Query("type_id") type_id?: string,
    @Query("derived_tier") derived_tier?: string,
  ) {
    return this.catalog.items({ layer, type_id, derived_tier });
  }

  @Get("items/:id")
  item(@Param("id") id: string) {
    return this.catalog.item(id);
  }
}
