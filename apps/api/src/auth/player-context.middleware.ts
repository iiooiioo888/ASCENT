import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { LOCAL_PLAYER_ID } from "@ascent/shared";
import type { NextFunction, Request, Response } from "express";
import { verifySession } from "./jwt";
import { runWithPlayer } from "./player-context";

function isPublicRoute(method: string, path: string): boolean {
  if (
    method === "POST" &&
    (path === "/api/v1/auth/login" || path === "/api/v1/auth/register" || path === "/api/v1/auth/refresh")
  ) {
    return true;
  }
  if (method === "GET" && path === "/api/v1/time") return true;
  if (method === "GET" && (path === "/api/v1/item-types" || path === "/api/v1/item-properties")) return true;
  if (method === "GET" && (path === "/api/v1/items" || path.startsWith("/api/v1/items/"))) return true;
  if (
    method === "GET" &&
    (path === "/api/v1/production-rules" ||
      path.startsWith("/api/v1/production-rules/") ||
      path === "/api/v1/production-methods" ||
      path.startsWith("/api/v1/production-methods/") ||
      path === "/api/v1/loops")
  ) {
    return true;
  }
  if (method === "POST" && path === "/api/v1/validate") return true;
  return false;
}

@Injectable()
export class PlayerContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
    if (token) {
      const claims = verifySession(token);
      if (!claims) {
        next(new UnauthorizedException("登入已失效"));
        return;
      }
      runWithPlayer(claims.sub, () => next());
      return;
    }

    if (process.env.ASCENT_REQUIRE_AUTH === "0") {
      runWithPlayer(LOCAL_PLAYER_ID, () => next());
      return;
    }

    if (isPublicRoute(req.method.toUpperCase(), req.path)) {
      next();
      return;
    }

    next(new UnauthorizedException("請先登入"));
  }
}
