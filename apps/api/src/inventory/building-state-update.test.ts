import { ConflictException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  BUILDING_STATE_CONFLICT_MESSAGE,
  SETTLEMENT_CONFLICT_MESSAGE,
  throwIfStateConflict,
} from "./building-state-update";

describe("throwIfStateConflict", () => {
  it("updateMany 未命中列時拋 409 Conflict", () => {
    expect(() => throwIfStateConflict(0)).toThrow(ConflictException);
    try {
      throwIfStateConflict(0);
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getStatus()).toBe(409);
      expect((err as ConflictException).message).toContain(BUILDING_STATE_CONFLICT_MESSAGE);
    }
  });

  it("結算樂觀鎖失敗使用結算衝突訊息", () => {
    try {
      throwIfStateConflict(0, SETTLEMENT_CONFLICT_MESSAGE);
    } catch (err) {
      expect((err as ConflictException).getStatus()).toBe(409);
      expect((err as ConflictException).message).toBe(SETTLEMENT_CONFLICT_MESSAGE);
    }
  });

  it("至少更新一列時不拋錯", () => {
    expect(() => throwIfStateConflict(1)).not.toThrow();
  });
});
