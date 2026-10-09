import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { ACCESS_TOKEN_TTL_SEC, signSession, verifySession } from "./jwt";
import { hashRefreshToken, issueRefreshToken, refreshTokenMatches } from "./refresh-token";

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
    expect(verifySession(token, 1_000 + 60)?.sub).toBe("player_local");
    expect(verifySession(token, 1_000 + ACCESS_TOKEN_TTL_SEC + 1)).toBeNull();
    expect(verifySession(`${token}x`, 1_000)).toBeNull();
  });

  it("refresh token 雜湊可核對且每次簽發不同", () => {
    const first = issueRefreshToken();
    const second = issueRefreshToken();
    expect(first.token).not.toBe(second.token);
    expect(refreshTokenMatches(first.token, first.hash)).toBe(true);
    expect(refreshTokenMatches(first.token, hashRefreshToken(second.token))).toBe(false);
  });
});
