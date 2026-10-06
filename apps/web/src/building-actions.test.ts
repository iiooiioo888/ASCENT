import { describe, expect, it } from "vitest";
import { canStopBuilding } from "./building-actions";

describe("canStopBuilding", () => {
  it("enables stop only while running", () => {
    expect(canStopBuilding("running")).toBe(true);
  });

  it("disables stop when idle or ready to collect", () => {
    expect(canStopBuilding("idle")).toBe(false);
    expect(canStopBuilding("ready")).toBe(false);
  });
});
