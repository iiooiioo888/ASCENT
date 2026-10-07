import { describe, expect, it } from "vitest";
import { stopConfirmIntro } from "./stopConfirmCopy";

describe("stopConfirmIntro", () => {
  it("states inputs will be lost and does not promise refund", () => {
    const text = stopConfirmIntro("田", "種麥");
    expect(text).toContain("田");
    expect(text).toContain("種麥");
    expect(text).toContain("將失去");
    expect(text).not.toMatch(/退還|返還|可退/);
  });
});
