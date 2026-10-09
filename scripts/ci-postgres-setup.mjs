import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(root, "apps/api/prisma/schema.prisma");
const envPath = path.join(root, "apps/api/.env");

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://ascent:ascent@localhost:5432/ascent";

function parseHostPort(url) {
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname || "127.0.0.1", port: Number(parsed.port || 5432) };
  } catch {
    return { host: "127.0.0.1", port: 5432 };
  }
}

function waitForPort(host, port, timeoutMs = 30_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ host, port }, () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Postgres ${host}:${port} 未就緒`));
          return;
        }
        setTimeout(attempt, 500);
      });
    };
    attempt();
  });
}

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

const { host, port } = parseHostPort(databaseUrl);
await waitForPort(host, port);
console.log(`已設定 Postgres：${databaseUrl.replace(/:[^:@/]+@/, ":****@")}`);
