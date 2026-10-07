import { describe, expect, it } from "vitest";
import {
  MARKET_POLL_INTERVAL_MS,
  RETAIL_POLL_INTERVAL_MS,
  STATE_POLL_INTERVAL_MS,
} from "./gamePoll";

describe("gamePoll", () => {
  it("retail poll is slower than state and not faster than market", () => {
    expect(STATE_POLL_INTERVAL_MS).toBeLessThan(MARKET_POLL_INTERVAL_MS);
    expect(MARKET_POLL_INTERVAL_MS).toBeLessThanOrEqual(RETAIL_POLL_INTERVAL_MS);
  });
});
