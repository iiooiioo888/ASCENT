import { describe, expect, it } from "vitest";
import { buildSparklinePath, formatCommodityChange } from "./sparkline";

describe("buildSparklinePath", () => {
  it("draws a flat line when history is empty", () => {
    const path = buildSparklinePath([], 80, 24);
    expect(path).toMatch(/^M /);
    expect(path).toContain("L ");
  });

  it("maps multiple points into an SVG path", () => {
    const path = buildSparklinePath(
      [{ price: 10 }, { price: 20 }, { price: 15 }],
      80,
      24,
    );
    expect(path.split("L ").length).toBe(3);
  });

  it("handles a single history point", () => {
    const path = buildSparklinePath([{ price: 15 }], 80, 24);
    expect(path).toMatch(/^M /);
  });
});

describe("formatCommodityChange", () => {
  it("prefixes positive changes", () => {
    expect(formatCommodityChange(2)).toBe("+2");
  });

  it("keeps negative changes", () => {
    expect(formatCommodityChange(-3)).toBe("-3");
  });
});
