import { describe, expect, it } from "vitest";
import { FEATURE_SILO_CARD_MODE, FEATURE_SHOW_SILO_PLACEMENT } from "./featureFlags";

describe("featureFlags defaults (U12 placeholders)", () => {
  it("defaults to simplified silo card and visible placement", () => {
    expect(FEATURE_SILO_CARD_MODE).toBe("simplified");
    expect(FEATURE_SHOW_SILO_PLACEMENT).toBe(true);
  });
});
