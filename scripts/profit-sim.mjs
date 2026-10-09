import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { formatProfitSimTable } = require("../packages/shared/dist/index.js");

console.log("《帝國掘起》空間×時間利潤試算（簽核價目，不另開電子表格）");
console.log("");
console.log(formatProfitSimTable());
