import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  itemTypes() {
    return this.prisma.itemType.findMany({ where: { isActive: true } });
  }

  itemProperties() {
    return this.prisma.itemProperty.findMany({ where: { isActive: true } });
  }

  items(q: { layer?: string; type_id?: string; derived_tier?: string }) {
    return this.prisma.item.findMany({
      where: {
        isActive: true,
        ...(q.layer ? { layer: q.layer } : {}),
        ...(q.type_id ? { typeId: q.type_id } : {}),
        ...(q.derived_tier ? { derivedTier: Number(q.derived_tier) } : {}),
      },
    });
  }

  item(id: string) {
    return this.prisma.item.findFirst({ where: { id, isActive: true } });
  }
}
