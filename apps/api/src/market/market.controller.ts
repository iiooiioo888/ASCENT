import { Body, Controller, Get, Post } from "@nestjs/common";
import { EquityMarketService } from "./equity-market.service";
import { MarketService } from "./market.service";

@Controller("api/v1/market")
export class MarketController {
  constructor(
    private readonly market: MarketService,
    private readonly equityMarket: EquityMarketService,
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

  @Get("equity")
  getEquity() {
    return this.equityMarket.getEquityMarket();
  }

  @Post("equity/buy")
  equityBuy(@Body() body: { equityId: string; quantity: number; clientRequestId?: string }) {
    return this.equityMarket.buy(body.equityId, body.quantity);
  }

  @Post("equity/sell")
  equitySell(@Body() body: { equityId: string; quantity: number; clientRequestId?: string }) {
    return this.equityMarket.sell(body.equityId, body.quantity);
  }
}
