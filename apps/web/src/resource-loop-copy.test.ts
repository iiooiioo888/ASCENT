import { describe, expect, it } from "vitest";
import {
  FIELD_BUILDING_DEF_ID,
  METHOD_SAVE_SEED_ID,
  TRADING_POST_BUILDING_DEF_ID,
  WELL_BUILDING_DEF_ID,
} from "./resource-loop-copy";

describe("resource loop catalog ids", () => {
  it("uses shared placeholder ids for well, trading post, field, and save-seed method", () => {
    expect(WELL_BUILDING_DEF_ID).toBe("bdef_well");
    expect(TRADING_POST_BUILDING_DEF_ID).toBe("bdef_trading_post");
    expect(FIELD_BUILDING_DEF_ID).toBe("bdef_field");
    expect(METHOD_SAVE_SEED_ID).toBe("method_save_seed_default");
  });
});
