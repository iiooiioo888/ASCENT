import { describe, expect, it } from "vitest";
import { formatQuantity, formatUserError, fmtIo } from "./format";

describe("formatQuantity", () => {
  it("shows integers without decimals", () => {
    expect(formatQuantity(80)).toBe("80");
    expect(formatQuantity(0)).toBe("0");
  });

  it("shows fractional values with up to 2 decimals", () => {
    expect(formatQuantity(79.5)).toBe("79.5");
    expect(formatQuantity(0.5)).toBe("0.5");
    expect(formatQuantity(1.25)).toBe("1.25");
  });

  it("trims trailing zeros on fractional values", () => {
    expect(formatQuantity(1.1)).toBe("1.1");
    expect(formatQuantity(1.5)).toBe("1.5");
  });
});

describe("formatUserError", () => {
  it("removes Error prefix and maps item ids", () => {
    expect(formatUserError(new Error("資源不足：item_water"))).toBe("資源不足：水");
    expect(formatUserError("Error: 資源不足：item_water")).toBe("資源不足：水");
  });
});

describe("fmtIo", () => {
  it("formats fractional input quantities", () => {
    expect(fmtIo([{ item_id: "item_water", qty: 0.5 }])).toContain("×0.5");
  });
});
