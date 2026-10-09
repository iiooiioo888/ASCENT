import { randomBytes } from "node:crypto";
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { LOCAL_PLAYER_ID } from "@ascent/shared";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ACCESS_TOKEN_TTL_SEC, signSession } from "./jwt";
import { assertPassword, assertUsername, hashPassword, verifyPassword } from "./password";
import { provisionNewPlayer } from "./provision-player";
import { currentPlayerId } from "./player-context";
import { hashRefreshToken, issueRefreshToken, refreshTokenMatches } from "./refresh-token";

export type AuthSession = {
  token: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  playerId: string;
  username: string;
  adoptedExistingWorld: boolean;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(rawUsername: string, rawPassword: string): Promise<AuthSession> {
    const username = this.readUsername(rawUsername);
    const password = this.readPassword(rawPassword);
    const now = new Date();
    const passwordHash = hashPassword(password);
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const taken = await tx.account.findUnique({ where: { username } });
        if (taken) throw new ConflictException("這個名字已經有人用了");

        const accountCount = await tx.account.count();
        let playerId = "";
        let adoptedExistingWorld = false;
        if (accountCount === 0) {
          const local = await tx.player.findUnique({ where: { id: LOCAL_PLAYER_ID } });
          const claimed = await tx.account.findUnique({ where: { playerId: LOCAL_PLAYER_ID } });
          if (local && !claimed) {
            playerId = LOCAL_PLAYER_ID;
            adoptedExistingWorld = true;
          }
        }
        if (!playerId) {
          const worldCount = await tx.player.count();
          if (worldCount >= 1) {
            throw new ConflictException("主線存檔已存在，請登入現有帳號");
          }
          playerId = `player_${randomBytes(8).toString("hex")}`;
          await provisionNewPlayer(tx, playerId, now);
        }

        const account = await tx.account.create({
          data: {
            id: `acct_${randomBytes(8).toString("hex")}`,
            username,
            passwordHash,
            playerId,
            createdAt: now,
          },
        });
        await tx.player.update({
          where: { id: playerId },
          data: { lastSeenAt: now },
        });
        return { accountId: account.id, playerId, adoptedExistingWorld };
      });
      return this.session(created.accountId, created.playerId, username, created.adoptedExistingWorld);
    } catch (err) {
      if (err instanceof ConflictException || err instanceof BadRequestException) throw err;
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException("這個名字已經有人用了");
      }
      throw err;
    }
  }

  async login(rawUsername: string, rawPassword: string): Promise<AuthSession> {
    const username = this.readUsername(rawUsername);
    const password = this.readPassword(rawPassword);
    const account = await this.prisma.account.findUnique({ where: { username } });
    if (!account || !verifyPassword(password, account.passwordHash)) {
      throw new UnauthorizedException("名字或密碼不對");
    }
    await this.prisma.player.update({
      where: { id: account.playerId },
      data: { lastSeenAt: new Date() },
    });
    return this.session(account.id, account.playerId, account.username, false);
  }

  async refresh(rawToken: string): Promise<AuthSession> {
    const token = rawToken.trim();
    if (!token) throw new UnauthorizedException("請先登入");
    const hash = hashRefreshToken(token);
    const account = await this.prisma.account.findFirst({
      where: { refreshTokenHash: hash },
    });
    if (!account || !refreshTokenMatches(token, account.refreshTokenHash)) {
      throw new UnauthorizedException("登入已失效");
    }
    if (!account.refreshTokenExpiresAt || account.refreshTokenExpiresAt.getTime() <= Date.now()) {
      await this.prisma.account.update({
        where: { id: account.id },
        data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
      });
      throw new UnauthorizedException("登入已失效");
    }
    await this.prisma.player.update({
      where: { id: account.playerId },
      data: { lastSeenAt: new Date() },
    });
    return this.session(account.id, account.playerId, account.username, false);
  }

  async logout(): Promise<{ ok: true }> {
    const playerId = currentPlayerId();
    const account = await this.prisma.account.findUnique({ where: { playerId } });
    if (account) {
      await this.prisma.account.update({
        where: { id: account.id },
        data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
      });
    }
    return { ok: true };
  }

  async me(): Promise<{ playerId: string; username: string }> {
    const playerId = currentPlayerId();
    const account = await this.prisma.account.findUnique({ where: { playerId } });
    if (!account) throw new UnauthorizedException("請先登入");
    return { playerId: account.playerId, username: account.username };
  }

  private async session(
    accountId: string,
    playerId: string,
    username: string,
    adoptedExistingWorld: boolean,
  ): Promise<AuthSession> {
    const refresh = issueRefreshToken();
    await this.prisma.account.update({
      where: { id: accountId },
      data: {
        refreshTokenHash: refresh.hash,
        refreshTokenExpiresAt: refresh.expiresAt,
      },
    });
    const accessToken = signSession({ sub: playerId, accountId, username });
    return {
      token: accessToken,
      accessToken,
      refreshToken: refresh.token,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
      playerId,
      username,
      adoptedExistingWorld,
    };
  }

  private readUsername(username: string): string {
    try {
      return assertUsername(username);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "名字不正確");
    }
  }

  private readPassword(password: string): string {
    try {
      return assertPassword(password);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "密碼不正確");
    }
  }
}
