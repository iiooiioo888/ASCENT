import { describe, expect, it } from "vitest";
import {
  collectHighlightItemIds,
  formatCollectSuccess,
  SUCCESS_FEEDBACK_MS,
} from "./successFeedback";

describe("formatCollectSuccess", () => {
  it("formats buffered field outputs for U9", () => {
    expect(
      formatCollectSuccess({ item_wheat: 2, item_straw: 1 }),
    ).toBe("+2 小麥 +1 秸稈");
  });

  it("returns null when nothing to collect", () => {
    expect(formatCollectSuccess({})).toBeNull();
    expect(formatCollectSuccess({ item_wheat: 0 })).toBeNull();
  });
});

describe("SUCCESS_FEEDBACK_MS", () => {
  it("matches U9 acceptance (2 second feedback window)", () => {
    expect(SUCCESS_FEEDBACK_MS).toBe(2000);
  });
});

describe("collectHighlightItemIds", () => {
  it("lists items with positive buffered qty", () => {
    expect(collectHighlightItemIds({ item_wheat: 2, item_straw: 1, item_flour: 0 })).toEqual([
      "item_wheat",
      "item_straw",
    ]);
  });
});
