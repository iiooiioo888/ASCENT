import { describe, expect, it } from "vitest";
import {
  MARKET_SEED_GENERATION,
  SEED_GENERATION_MAX,
  applySeedGenerationToGrowOutputs,
  clampGeneration,
  generationBonusFactor,
  mixGeneration,
  nextSavedSeedGeneration,
  seedGenerationLabel,
} from "./seed-lineage";

describe("種子代數", () => {
  it("第 0 代無加成，每代 +20%，上限 5", () => {
    expect(generationBonusFactor(0)).toBe(1);
    expect(generationBonusFactor(1)).toBe(1.2);
    expect(generationBonusFactor(5)).toBe(2);
    expect(generationBonusFactor(9)).toBe(2);
    expect(clampGeneration(-1)).toBe(0);
    expect(clampGeneration(SEED_GENERATION_MAX + 3)).toBe(SEED_GENERATION_MAX);
  });

  it("一代把 2 麥變成 2.4", () => {
    expect(applySeedGenerationToGrowOutputs({ item_wheat: 2, item_straw: 1 }, 1)).toEqual({
      item_wheat: 2.4,
      item_straw: 1,
    });
  });

  it("留種代數 +1；買種是 0 代", () => {
    expect(nextSavedSeedGeneration(0)).toBe(1);
    expect(nextSavedSeedGeneration(4.9)).toBe(5);
    expect(MARKET_SEED_GENERATION).toBe(0);
  });

  it("買種會稀釋代數", () => {
    expect(mixGeneration(10, 4, 10, 0)).toBe(2);
  });

  it("文案含代數與加成", () => {
    expect(seedGenerationLabel(0)).toContain("0");
    expect(seedGenerationLabel(2)).toContain("+40%");
  });
});
