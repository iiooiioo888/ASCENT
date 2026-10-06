import { describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client";
import { createPrismaAdapter } from "../prisma/create-prisma-adapter";
import { itemProperties } from "@ascent/shared";

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

describe("目錄 GET 資料（需先 pnpm setup:db 或 db:seed）", () => {
  it("item_properties 與 shared 目錄一致且可冪等重跑 seed", async () => {
    const rows = await prisma.itemProperty.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
    expect(rows.length).toBe(itemProperties.length);
    expect(rows.map((r) => r.code)).toEqual(
      [...itemProperties].sort((a, b) => a.code.localeCompare(b.code)).map((p) => p.code),
    );

    for (const p of itemProperties) {
      await prisma.itemProperty.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          code: p.code,
          name: p.name,
          valueKind: p.value_kind,
          isActive: p.is_active,
          releasedInVersion: p.released_in_version,
        },
        update: {
          code: p.code,
          name: p.name,
          valueKind: p.value_kind,
          isActive: p.is_active,
          releasedInVersion: p.released_in_version,
        },
      });
    }
    const countAfter = await prisma.itemProperty.count();
    expect(countAfter).toBe(itemProperties.length);
  });
});
