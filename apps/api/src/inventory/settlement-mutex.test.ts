import { describe, expect, it } from "vitest";
import { SettlementMutex } from "./settlement-mutex";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("SettlementMutex", () => {
  it("併發 settle 不會重疊，第二段必須等第一段完成（防雙重結算時間窗）", async () => {
    const mutex = new SettlementMutex();
    const log: string[] = [];
    let lastSettledAtMs = 0;

    const settleOnce = (name: string, deltaMs: number) =>
      mutex.runExclusive(async () => {
        const seen = lastSettledAtMs;
        log.push(`${name}:begin:${seen}`);
        await delay(15);
        lastSettledAtMs = seen + deltaMs;
        log.push(`${name}:end:${lastSettledAtMs}`);
      });

    await Promise.all([settleOnce("http", 5000), settleOnce("cron", 5000)]);

    expect(lastSettledAtMs).toBe(10_000);
    const httpEnd = log.indexOf("http:end:5000");
    const cronBegin = log.indexOf("cron:begin:5000");
    expect(httpEnd).toBeGreaterThan(-1);
    expect(cronBegin).toBeGreaterThan(httpEnd);
  });

  it("collect 關鍵區段持鎖時，背景 settle 無法插入（防重複入帳 buffer）", async () => {
    const mutex = new SettlementMutex();
    let status: "ready" | "idle" = "ready";
    let inventory = 0;
    const bufferQty = 3;

    const collect = mutex.runExclusive(async () => {
      await delay(5);
      if (status !== "ready") throw new Error("not ready");
      inventory += bufferQty;
      await delay(20);
      status = "idle";
    });

    const cronSettle = mutex.runExclusive(async () => {
      if (status === "ready") {
        inventory += bufferQty;
      }
    });

    await Promise.all([collect, cronSettle]);
    expect(inventory).toBe(bufferQty);
    expect(status).toBe("idle");
  });
});
