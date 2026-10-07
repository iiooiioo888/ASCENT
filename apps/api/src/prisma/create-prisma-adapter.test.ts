import { describe, expect, it } from "vitest";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { createPrismaAdapterFromUrl } from "./create-prisma-adapter";

describe("createPrismaAdapterFromUrl", () => {
  it("postgres:// 使用 PrismaPg", () => {
    const adapter = createPrismaAdapterFromUrl("postgresql://u:p@localhost:5432/ascent");
    expect(adapter).toBeInstanceOf(PrismaPg);
  });

  it("file: 使用 PrismaBetterSqlite3", () => {
    const adapter = createPrismaAdapterFromUrl("file:./dev.db");
    expect(adapter).toBeInstanceOf(PrismaBetterSqlite3);
  });

  it("sqlite: 使用 PrismaBetterSqlite3", () => {
    const adapter = createPrismaAdapterFromUrl("sqlite:./dev.db");
    expect(adapter).toBeInstanceOf(PrismaBetterSqlite3);
  });

  it("mysql:// 等非支援協定會拋錯（唔静默落 SQLite）", () => {
    expect(() => createPrismaAdapterFromUrl("mysql://root:pass@localhost:3306/app")).toThrow(
      /不支援的 DATABASE_URL/,
    );
    expect(() => createPrismaAdapterFromUrl("mysql://root:pass@localhost:3306/app")).toThrow(/mysql/);
  });

  it("未知字串會拋錯", () => {
    expect(() => createPrismaAdapterFromUrl("not-a-url")).toThrow(/不支援的 DATABASE_URL/);
  });
});
