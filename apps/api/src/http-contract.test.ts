import { beforeAll, describe, expect, it } from "vitest";

const defaultBase = "http://127.0.0.1:3000/api/v1";
const baseUrl = process.env.API_BASE_URL ?? defaultBase;
let apiUp = false;

async function post(pathSuffix: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${pathSuffix}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  return { status: res.status, json };
}

async function get(pathSuffix: string) {
  const res = await fetch(`${baseUrl}${pathSuffix}`);
  return { status: res.status, json: await res.json() };
}

function skipUnlessApi(ctx: { skip: (reason?: string) => void }) {
  if (!apiUp) ctx.skip("API not reachable — start apps/api on :3000 for HTTP contract smoke");
}

beforeAll(async () => {
  try {
    const { status } = await get("/time");
    apiUp = status === 200;
  } catch {
    apiUp = false;
  }
});

describe("HTTP contract (docs/api/v1.md smoke)", () => {
  const fieldId = "pb_player_local_bdef_field";

  it("GET /time returns documented shape with 200", async (ctx) => {
    skipUnlessApi(ctx);
    const { status, json } = await get("/time");
    expect(status).toBe(200);
    expect(json).toMatchObject({
      startRealTime: expect.any(String),
      startGameTime: expect.any(Number),
      serverRealTime: expect.any(String),
      displayGameTime: expect.any(Number),
      timeScale: 60,
    });
  });

  it("GET /state returns inventory, buildings, methods, buildingDefs, time", async (ctx) => {
    skipUnlessApi(ctx);
    const { status, json } = await get("/state");
    expect(status).toBe(200);
    expect(json).toHaveProperty("inventory");
    expect(json).toHaveProperty("buildings");
    expect(json).toHaveProperty("methods");
    expect(json).toHaveProperty("buildingDefs");
    expect(json).toHaveProperty("time");
  });

  it("POST start/stop/collect return expected error shapes", async (ctx) => {
    skipUnlessApi(ctx);
    const missing = await post("/buildings/does-not-exist/stop");
    expect(missing.status).toBe(404);
    expect(missing.json.message).toMatch(/不存在/);

    const badMethod = await post(`/buildings/${fieldId}/start`, { methodId: "not_a_method" });
    expect(badMethod.status).toBe(400);

    const collectIdle = await post(`/buildings/${fieldId}/collect`);
    expect([400, 409]).toContain(collectIdle.status);
  });

  it("POST start returns 201 when idle and stocked, else documented 400", async (ctx) => {
    skipUnlessApi(ctx);
    await post(`/buildings/${fieldId}/stop`);
    let start = await post(`/buildings/${fieldId}/start`, { methodId: "method_grow_wheat_default" });
    if (start.status === 400 && String(start.json.message).match(/忙碌|待收取/)) {
      await post(`/buildings/${fieldId}/stop`);
      start = await post(`/buildings/${fieldId}/start`, { methodId: "method_grow_wheat_default" });
    }
    if (start.status === 400 && String(start.json.message).match(/資源不足/)) {
      expect(start.json.statusCode).toBe(400);
      return;
    }
    expect(start.status).toBe(201);
    expect(start.json).toMatchObject({ status: "running", methodId: "method_grow_wheat_default" });
    await post(`/buildings/${fieldId}/stop`);
  });
});
