import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const example = path.join(root, ".env.example");
const apiEnv = path.join(root, "apps/api/.env");

if (!fs.existsSync(apiEnv) && fs.existsSync(example)) {
  fs.copyFileSync(example, apiEnv);
  console.log("已從 .env.example 建立 apps/api/.env");
}
