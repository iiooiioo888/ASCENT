import { PrismaClient } from "../generated/prisma/client";
import { createPrismaAdapter } from "../src/prisma/create-prisma-adapter";

const secondsAgo = Math.max(1, Number(process.argv[2] ?? "120"));
const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

await prisma.playerBuilding.updateMany({
  data: { lastSettledAt: new Date(Date.now() - secondsAgo * 1000) },
});
await prisma.$disconnect();
console.log(`已把建築 lastSettledAt 往回撥 ${secondsAgo} 現實秒`);
