import { describe, expect, it } from "vitest";
import { stopConfirmIntro } from "./stopConfirmCopy";

describe("stopConfirmIntro", () => {
  it("names building and method; states loss without refund", () => {
    const text = stopConfirmIntro("田", "種麥");
    expect(text).toContain("田");
    expect(text).toContain("種麥");
    expect(text).toMatch(/將失去/);
    expect(text).not.toMatch(/退還|返還|可退回/);
  });
});
