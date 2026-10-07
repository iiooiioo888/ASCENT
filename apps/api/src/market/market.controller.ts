import { Body, Controller, Get, Post } from "@nestjs/common";
import { MarketService } from "./market.service";

@Controller("api/v1/market")
export class MarketController {
  constructor(private readonly market: MarketService) {}

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
}
