import { ConflictException } from "@nestjs/common";

export const BUILDING_STATE_CONFLICT_MESSAGE = "建築狀態已變更，請重新整理";
export const SETTLEMENT_CONFLICT_MESSAGE = "建築結算衝突，請重試";

export function throwIfStateConflict(
  updatedCount: number,
  message = BUILDING_STATE_CONFLICT_MESSAGE,
): void {
  if (updatedCount < 1) {
    throw new ConflictException(message);
  }
}
