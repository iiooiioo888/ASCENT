import { describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { createPrismaAdapterFromUrl } from "./create-prisma-adapter";

/** 與 create-prisma-adapter 內 SQLite 分支相同之 lazy require，避免 ESM/CJS 雙模組導致 instanceof 失效。 */
function sqliteAdapterClass() {
  const { PrismaBetterSqlite3 } =
    require("@prisma/adapter-better-sqlite3") as typeof import("@prisma/adapter-better-sqlite3");
  return PrismaBetterSqlite3;
}

function expectBetterSqlite3Adapter(adapter: unknown) {
  expect(adapter).toBeInstanceOf(sqliteAdapterClass());
  expect(adapter).toMatchObject({ provider: "sqlite" });
}

describe("createPrismaAdapterFromUrl", () => {
  it("postgres:// 使用 PrismaPg", () => {
    const adapter = createPrismaAdapterFromUrl("postgresql://u:p@localhost:5432/ascent");
    expect(adapter).toBeInstanceOf(PrismaPg);
  });

  it("file: 使用 PrismaBetterSqlite3", () => {
    const adapter = createPrismaAdapterFromUrl("file:./dev.db");
    expectBetterSqlite3Adapter(adapter);
  });

  it("sqlite: 使用 PrismaBetterSqlite3", () => {
    const adapter = createPrismaAdapterFromUrl("sqlite:./dev.db");
    expectBetterSqlite3Adapter(adapter);
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
