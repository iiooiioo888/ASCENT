import { afterEach, describe, expect, it, vi } from "vitest";

describe("featureFlags defaults (U12 placeholders)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to simplified silo card and hidden silo placement (P-D3)", async () => {
    const { FEATURE_SILO_CARD_MODE, FEATURE_SHOW_SILO_PLACEMENT } = await import("./featureFlags");
    expect(FEATURE_SILO_CARD_MODE).toBe("simplified");
    expect(FEATURE_SHOW_SILO_PLACEMENT).toBe(false);
  });

  it("resolveShowSiloPlacement uses parseViteBooleanEnv (FALSE accepted)", async () => {
    vi.stubEnv("VITE_FEATURE_SHOW_SILO_PLACEMENT", "FALSE");
    vi.resetModules();
    const { resolveShowSiloPlacement } = await import("./featureFlags");
    expect(resolveShowSiloPlacement()).toBe(false);
  });

  it("resolveShowSiloPlacement treats OFF as false", async () => {
    vi.stubEnv("VITE_FEATURE_SHOW_SILO_PLACEMENT", " off ");
    vi.resetModules();
    const { resolveShowSiloPlacement } = await import("./featureFlags");
    expect(resolveShowSiloPlacement()).toBe(false);
  });
});
