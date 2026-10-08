import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SEC = 7 * 24 * 60 * 60;

export type SessionClaims = {
  sub: string;
  accountId: string;
  username: string;
  exp: number;
};

export function jwtSecret(): string {
  const fromEnv = process.env.AUTH_JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("正式環境必須設定 AUTH_JWT_SECRET");
  }
  return "ascent-dev-jwt-secret";
}

export function signSession(claims: Omit<SessionClaims, "exp">, nowSec = Math.floor(Date.now() / 1000)): string {
  const body: SessionClaims = { ...claims, exp: nowSec + TOKEN_TTL_SEC };
  const data = Buffer.from(JSON.stringify(body), "utf8").toString("base64url");
  const sig = createHmac("sha256", jwtSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySession(token: string, nowSec = Math.floor(Date.now() / 1000)): SessionClaims | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;
  const expected = createHmac("sha256", jwtSecret()).update(data).digest("base64url");
  const actualBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionClaims;
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return null;
    if (typeof payload.accountId !== "string" || typeof payload.username !== "string") return null;
    if (typeof payload.exp !== "number" || payload.exp < nowSec) return null;
    return payload;
  } catch {
    return null;
  }
}
