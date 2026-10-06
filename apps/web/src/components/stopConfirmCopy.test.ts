import { describe, expect, it } from "vitest";
import { stopConfirmIntro } from "./stopConfirmCopy";

describe("stopConfirmIntro", () => {
  it("names building and method without refund commitment", () => {
    const text = stopConfirmIntro("田", "種麥");
    expect(text).toContain("田");
    expect(text).toContain("種麥");
    expect(text).not.toMatch(/退還|返還/);
  });
});
