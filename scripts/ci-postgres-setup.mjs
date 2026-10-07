import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(root, "apps/api/prisma/schema.prisma");
const envPath = path.join(root, "apps/api/.env");

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://ascent:ascent@localhost:5432/ascent";

let schema = fs.readFileSync(schemaPath, "utf8");
if (!schema.includes('provider = "postgresql"')) {
  schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, schema);
}

fs.writeFileSync(
  envPath,
  [
    `DATABASE_URL="${databaseUrl}"`,
    "PORT=3000",
    "WEB_ORIGIN=http://localhost:5173",
    "",
  ].join("\n"),
);

console.log(`已設定 Postgres：${databaseUrl.replace(/:[^:@/]+@/, ":****@")}`);
