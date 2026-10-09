import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

function shouldSkip(): boolean {
  if (process.env.ASCENT_THROTTLE === "0") return true;
  if (process.env.NODE_ENV === "test") return true;
  return false;
}

export function resetWriteThrottleBuckets(): void {
  buckets.clear();
}

function ruleFor(method: string, path: string): { limit: number; windowMs: number; name: string } | null {
  if (
    method === "POST" &&
    (path === "/api/v1/auth/login" || path === "/api/v1/auth/register" || path === "/api/v1/auth/refresh")
  ) {
    return { limit: 8, windowMs: 60_000, name: "auth" };
  }
  if (method === "POST" && (path === "/api/v1/market/buy" || path === "/api/v1/market/sell")) {
    return { limit: 30, windowMs: 60_000, name: "market" };
  }
  if (
    (method === "POST" || method === "PATCH") &&
    (path.startsWith("/api/v1/buildings") || path.startsWith("/api/v1/orders"))
  ) {
    return { limit: 40, windowMs: 60_000, name: "write" };
  }
  return null;
}

@Injectable()
export class WriteThrottleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (shouldSkip()) return true;
    const req = context.switchToHttp().getRequest<Request>();
    const method = (req.method ?? "GET").toUpperCase();
    const path = (req.path ?? req.url ?? "").split("?")[0];
    const rule = ruleFor(method, path);
    if (!rule) return true;
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${rule.name}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < rule.windowMs);
    if (bucket.timestamps.length >= rule.limit) {
      throw new HttpException("請求過於頻繁，請稍後再試", HttpStatus.TOO_MANY_REQUESTS);
    }
    bucket.timestamps.push(now);
    buckets.set(key, bucket);
    return true;
  }
}
