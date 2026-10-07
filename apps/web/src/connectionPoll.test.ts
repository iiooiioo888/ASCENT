import { describe, expect, it } from "vitest";
import {
  nextPollFailureCount,
  POLL_FAILURE_THRESHOLD,
  shouldShowConnectionLost,
} from "./connectionPoll";

describe("connectionPoll", () => {
  it("resets failure count on success", () => {
    expect(nextPollFailureCount(2, false)).toBe(0);
  });

  it("increments on failure", () => {
    expect(nextPollFailureCount(0, true)).toBe(1);
    expect(nextPollFailureCount(2, true)).toBe(3);
  });

  it("shows connection lost at threshold", () => {
    expect(shouldShowConnectionLost(POLL_FAILURE_THRESHOLD - 1)).toBe(false);
    expect(shouldShowConnectionLost(POLL_FAILURE_THRESHOLD)).toBe(true);
  });
});
