import { describe, expect, it } from "vitest";
import { mixFeedDefault } from "../prb-demo/fixtures";
import { formatStopConfirmLossLine, stopConfirmIntro, stopConfirmLossHeading } from "./stopConfirmCopy";

describe("stopConfirmIntro", () => {
  it("names building and method with v1.1 non-refund loss wording", () => {
    const text = stopConfirmIntro("田", "種麥");
    expect(text).toContain("田");
    expect(text).toContain("種麥");
    expect(text).toMatch(/將失去/);
    expect(text).not.toMatch(/退還|返還|可退回/);
  });

  it("exposes loss heading for dialog", () => {
    expect(stopConfirmLossHeading()).toBe("將失去");
  });
});

describe("formatStopConfirmLossLine", () => {
  it("includes materials and non-refundable wage/haul", () => {
    const line = formatStopConfirmLossLine(mixFeedDefault, { wage: 2, haul: 1 });
    expect(line).toMatch(/秸稈/);
    expect(line).toMatch(/工資 🪙2/);
    expect(line).toMatch(/運費 🪙1/);
  });
});
