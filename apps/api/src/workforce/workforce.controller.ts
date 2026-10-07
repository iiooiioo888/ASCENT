import { Controller, Post } from "@nestjs/common";
import { WorkforceService } from "./workforce.service";

@Controller("api/v1/workforce")
export class WorkforceController {
  constructor(private readonly workforce: WorkforceService) {}

  @Post("hire")
  hire() {
    return this.workforce.hire();
  }
}
