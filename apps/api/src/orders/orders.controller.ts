import { Controller, Get, Param, Post } from "@nestjs/common";
import { OrdersService } from "./orders.service";

@Controller("api/v1/orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list() {
    return this.orders.listPending();
  }

  @Post(":id/accept")
  accept(@Param("id") id: string) {
    return this.orders.accept(id);
  }
}
