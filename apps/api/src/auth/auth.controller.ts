import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body() body: { username?: string; password?: string }) {
    return this.auth.register(body?.username ?? "", body?.password ?? "");
  }

  @Post("login")
  login(@Body() body: { username?: string; password?: string }) {
    return this.auth.login(body?.username ?? "", body?.password ?? "");
  }

  @Get("me")
  me() {
    return this.auth.me();
  }
}
