import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const REFRESH_TOKEN_TTL_SEC = 14 * 24 * 60 * 60;

export function issueRefreshToken(): { token: string; hash: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    hash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000),
  };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function refreshTokenMatches(token: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) return false;
  const actual = Buffer.from(hashRefreshToken(token), "utf8");
  const expected = Buffer.from(storedHash, "utf8");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
