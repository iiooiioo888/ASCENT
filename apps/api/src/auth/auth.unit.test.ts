import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { signSession, verifySession } from "./jwt";

describe("密碼與 JWT", () => {
  it("雜湊可以核對，錯密碼不能過", () => {
    const stored = hashPassword("correct-horse");
    expect(verifyPassword("correct-horse", stored)).toBe(true);
    expect(verifyPassword("wrong-horse", stored)).toBe(false);
  });

  it("簽章過期或被改過就失效", () => {
    const token = signSession(
      { sub: "player_local", accountId: "acct_1", username: "farmer" },
      1_000,
    );
    expect(verifySession(token, 1_000)?.sub).toBe("player_local");
    expect(verifySession(token, 1_000 + 8 * 24 * 60 * 60)).toBeNull();
    expect(verifySession(`${token}x`, 1_000)).toBeNull();
  });
});
