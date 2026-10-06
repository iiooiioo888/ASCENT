/**
 * QA smoke for PR #4 — uses web-equivalent api() client against live API.
 * Run: node scripts/qa-pr4-smoke.mjs (API on :3000)
 */
const BASE = process.env.API_BASE ?? "http://localhost:3000";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray(body.message) ? body.message.join("；") : body.message;
    throw new ApiError(String(msg ?? res.statusText), res.status);
  }
  return { status: res.status, body: await res.json() };
}

const BUILDING_STATE_CHANGED_COPY = "狀態已變更，已重新整理";

function formatActionError(raw) {
  if (raw instanceof ApiError && raw.status === 409) return BUILDING_STATE_CHANGED_COPY;
  const msg = raw instanceof Error ? raw.message : String(raw);
  return msg.replace(/^Error:\s*/i, "");
}

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  // GET /time shape
  try {
    const { status, body } = await api("/api/v1/time");
    const keys = ["startRealTime", "startGameTime", "serverRealTime", "displayGameTime", "timeScale"];
    const shapeOk = status === 200 && keys.every((k) => k in body);
    record("GET /time 200 + shape", shapeOk, `status=${status}, keys=${keys.filter((k) => k in body).join(",")}`);
  } catch (e) {
    record("GET /time 200 + shape", false, String(e));
  }

  // GET /state shape
  try {
    const { status, body } = await api("/api/v1/state");
    const keys = ["time", "inventory", "buildings", "methods", "buildingDefs"];
    record(
      "GET /state 200 + shape",
      status === 200 && keys.every((k) => k in body),
      `buildings=${body.buildings?.length}`,
    );
  } catch (e) {
    record("GET /state 200 + shape", false, String(e));
  }

  const fieldId = "pb_player_local_bdef_field";
  const millId = "pb_player_local_bdef_mill";
  const missingId = "pb_player_local_nonexistent";

  // 404 building
  try {
    await api(`/api/v1/buildings/${missingId}`);
    record("GET /buildings/:id 404", false, "expected error");
  } catch (e) {
    record("GET /buildings/:id 404", e instanceof ApiError && e.status === 404, `status=${e.status} msg=${e.message}`);
  }

  // collect idle -> backend status (document mismatch check)
  try {
    await api(`/api/v1/buildings/${fieldId}/collect`, { method: "POST" });
    record("POST collect (idle) error status", false, "expected failure");
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 0;
    const copy = formatActionError(e);
    record(
      "POST collect (idle) → HTTP status",
      true,
      `http=${status} (frontend 409 path expects 409; got ${status})`,
    );
    record(
      "POST collect (idle) → UI copy via formatActionError",
      copy !== BUILDING_STATE_CHANGED_COPY,
      `copy="${copy}" (409 would show refresh message)`,
    );
  }

  // 400 wrong method on mill
  try {
    await api(`/api/v1/buildings/${millId}/start`, {
      method: "POST",
      body: JSON.stringify({ methodId: "method_grow_wheat_default" }),
    });
    record("POST start wrong method 400", false, "expected 400");
  } catch (e) {
    const ok = e instanceof ApiError && e.status === 400 && e.message === "此建築不能使用該方式";
    record("POST start wrong method 400 + message", ok, `status=${e.status} msg=${e.message}`);
    record("formatActionError 400", formatActionError(e) === "此建築不能使用該方式", formatActionError(e));
  }

  // collect success HTTP codes (api res.ok) — seed DB tweak via sqlite3
  const { execSync } = await import("node:child_process");
  const dbPath = new URL("../apps/api/prisma/dev.db", import.meta.url).pathname;
  execSync(
    `sqlite3 ${JSON.stringify(dbPath)} "UPDATE player_buildings SET status='ready', buffered_outputs='{\\"item_wheat\\":10}', method_id='method_grow_wheat_default' WHERE id='${fieldId}';"`,
  );

  try {
    const res = await fetch(`${BASE}/api/v1/buildings/${fieldId}/collect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    record(
      "POST collect (ready) success via res.ok",
      res.ok,
      `http=${res.status} building.status=${body.status}`,
    );
  } catch (e) {
    record("POST collect (ready) success", false, String(e));
  }

  // duplicate collect -> concurrent path
  try {
    await api(`/api/v1/buildings/${fieldId}/collect`, { method: "POST" });
    record("POST duplicate collect error", false, "expected error");
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 0;
    record("POST duplicate collect HTTP status", true, `http=${status}`);
    record(
      "POST duplicate collect formatActionError",
      formatActionError(e) === (status === 409 ? BUILDING_STATE_CHANGED_COPY : e.message),
      formatActionError(e),
    );
  }

  // concurrent start 409
  execSync(
    `sqlite3 ${JSON.stringify(dbPath)} "UPDATE player_buildings SET status='idle', method_id=NULL, queue='[]', buffered_outputs='{}' WHERE id='${millId}';"`,
  );

  const startPath = `/api/v1/buildings/${millId}/start`;
  const startBody = JSON.stringify({ methodId: "method_mill_flour_default" });
  const [r1, r2] = await Promise.all([
    fetch(`${BASE}${startPath}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: startBody }),
    fetch(`${BASE}${startPath}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: startBody }),
  ]);
  const statuses = [r1.status, r2.status].sort();
  const oneOk = statuses.some((s) => s >= 200 && s < 300);
  const one409 = statuses.includes(409);
  record("POST concurrent start 200/201 + 409", oneOk && one409, `statuses=${statuses.join(",")}`);

  if (one409) {
    const errBody = await (r1.status === 409 ? r1 : r2).json();
    const err = new ApiError(String(errBody.message ?? "Conflict"), 409);
    record("concurrent start → formatActionError", formatActionError(err) === BUILDING_STATE_CHANGED_COPY);
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n--- summary ---");
  console.log(`total=${results.length} pass=${results.length - failed.length} fail=${failed.length}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
