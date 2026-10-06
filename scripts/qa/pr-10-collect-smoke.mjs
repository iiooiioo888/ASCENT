/**
 * QA smoke for PR #10 @ bf09bbe — docs/api/v1.md + mvp.md collect/start status shapes.
 * Run: node scripts/qa/pr-10-collect-smoke.mjs (API on :3000, DB seeded).
 */
const base = process.env.API_BASE_URL ?? "http://127.0.0.1:3000/api/v1";
const fieldId = "pb_player_local_bdef_field";

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* empty */
  }
  return { status: res.status, json };
}

function assert(label, cond, detail = "") {
  if (!cond) throw new Error(`${label} failed${detail ? `: ${detail}` : ""}`);
  console.log(`✓ ${label}`);
}

async function main() {
  const idleCollect = await post(`/buildings/${fieldId}/collect`);
  assert("collect idle → 400", idleCollect.status === 400);
  assert("collect idle message", idleCollect.json.message === "尚無可收取產出");

  await post(`/buildings/${fieldId}/stop`);
  const start = await post(`/buildings/${fieldId}/start`, { methodId: "method_grow_wheat_default" });
  assert("start → 201", start.status === 201);

  const dupStart = await post(`/buildings/${fieldId}/start`, { methodId: "method_grow_wheat_default" });
  assert("duplicate start → 400 建築忙碌", dupStart.status === 400 && dupStart.json.message === "建築忙碌或待收取");

  const runningCollect = await post(`/buildings/${fieldId}/collect`);
  assert("collect while running → 400", runningCollect.status === 400);

  const { PrismaClient } = await import("../../apps/api/node_modules/@prisma/client/index.js");
  const prisma = new PrismaClient();
  await prisma.playerBuilding.update({
    where: { id: fieldId },
    data: {
      status: "ready",
      methodId: "method_grow_wheat_default",
      bufferedOutputs: { item_wheat: 2, item_straw: 1 },
      queue: [],
    },
  });

  const okCollect = await post(`/buildings/${fieldId}/collect`);
  assert("collect ready → 201", okCollect.status === 201);
  assert("collect response building idle", okCollect.json.status === "idle");

  const again = await post(`/buildings/${fieldId}/collect`);
  assert("second collect → 400", again.status === 400);

  await post(`/buildings/${fieldId}/stop`);
  await prisma.$disconnect();
  console.log("All PR-10 collect smoke checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
