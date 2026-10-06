import { Controller, Get, Param, Post } from "@nestjs/common";
import { RulesService } from "./rules.service";

@Controller("api/v1")
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Get("production-rules")
  productionRules() {
    return this.rules.productionRules();
  }

  @Get("production-rules/:id")
  productionRule(@Param("id") id: string) {
    return this.rules.productionRule(id);
  }

  @Get("production-methods")
  productionMethods() {
    return this.rules.productionMethods();
  }

  @Get("production-methods/:id")
  productionMethod(@Param("id") id: string) {
    return this.rules.productionMethod(id);
  }

  @Get("loops")
  loops() {
    return this.rules.loops();
  }

  @Post("validate")
  validate() {
    return this.rules.validate();
  }
}
