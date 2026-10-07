import { describe, expect, it } from "vitest";
import { jobProgressPercent, smoothElapsedGameSec } from "./productionProgress";

describe("productionProgress (P3-2)", () => {
  const job = { elapsedGameSec: 0, durationGameSec: 3600 };
  const serverRealTime = "2026-10-06T08:00:00.000Z";

  it("advances elapsed game seconds by real delta × timeScale", () => {
    const nowMs = Date.parse(serverRealTime) + 30_000;
    expect(smoothElapsedGameSec(job, 60, serverRealTime, nowMs)).toBe(1800);
    expect(jobProgressPercent(job, 60, serverRealTime, nowMs)).toBe(50);
  });

  it("caps at job duration", () => {
    const nowMs = Date.parse(serverRealTime) + 120_000;
    expect(smoothElapsedGameSec(job, 60, serverRealTime, nowMs)).toBe(3600);
  });
});
