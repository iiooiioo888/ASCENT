import { afterEach, describe, expect, it, vi } from "vitest";

describe("featureFlags defaults (U12 placeholders)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to simplified silo card and visible placement", async () => {
    const { FEATURE_SILO_CARD_MODE, FEATURE_SHOW_SILO_PLACEMENT } = await import("./featureFlags");
    expect(FEATURE_SILO_CARD_MODE).toBe("simplified");
    expect(FEATURE_SHOW_SILO_PLACEMENT).toBe(true);
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

  it("resolveShowSiloPlacement treats 0 as false", async () => {
    vi.stubEnv("VITE_FEATURE_SHOW_SILO_PLACEMENT", "0");
    vi.resetModules();
    const { resolveShowSiloPlacement } = await import("./featureFlags");
    expect(resolveShowSiloPlacement()).toBe(false);
  });

  it("resolveSiloCardMode falls back to simplified for invalid env", async () => {
    vi.stubEnv("VITE_FEATURE_SILO_CARD_MODE", "not-a-mode");
    vi.resetModules();
    const { resolveSiloCardMode, FEATURE_SILO_CARD_MODE } = await import("./featureFlags");
    expect(resolveSiloCardMode()).toBe("simplified");
    expect(FEATURE_SILO_CARD_MODE).toBe("simplified");
  });
});
