import { Body, Controller, Get, Post } from "@nestjs/common";
import { MarketService } from "./market.service";
import { CommodityMarketService } from "./commodity-market.service";
import { RetailMarketService } from "./retail-market.service";

@Controller("api/v1/market")
export class MarketController {
  constructor(
    private readonly market: MarketService,
    private readonly commodities: CommodityMarketService,
    private readonly retail: RetailMarketService,
  ) {}

  @Get()
  getMarket() {
    return this.market.getMarket();
  }

  @Post("sell")
  sell(@Body() body: { itemId: string; quantity: number }) {
    return this.market.sell(body.itemId, body.quantity);
  }

  @Post("buy")
  buy(@Body() body: { itemId: string; quantity: number }) {
    return this.market.buy(body.itemId, body.quantity);
  }

  @Get("commodities")
  getCommodities() {
    return this.commodities.getCommodities();
  }

  @Post("commodities/buy")
  buyCommodity(@Body() body: { commodityId: string; quantity: number }) {
    return this.commodities.buyCommodity(body.commodityId, body.quantity);
  }

  @Post("commodities/sell")
  sellCommodity(@Body() body: { commodityId: string; quantity: number }) {
    return this.commodities.sellCommodity(body.commodityId, body.quantity);
  }

  @Get("retail")
  getRetail() {
    return this.retail.getRetail();
  }

  @Post("retail/accept")
  acceptRetail(@Body() body: { offerId: string }) {
    return this.retail.acceptOffer(body.offerId);
  }
}
