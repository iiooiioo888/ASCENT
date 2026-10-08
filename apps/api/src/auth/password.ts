import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const USERNAME_PATTERN = /^[\p{L}\p{N}_]{3,24}$/u;

export function assertUsername(username: string): string {
  const name = username.trim();
  if (!USERNAME_PATTERN.test(name)) {
    throw new Error("名字要 3 到 24 個字，只能用文字、數字或底線");
  }
  return name;
}

export function assertPassword(password: string): string {
  if (password.length < 8 || password.length > 72) {
    throw new Error("密碼要 8 到 72 個字");
  }
  return password;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "base64url");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
