import { describe, expect, it } from "vitest";
import { fallowRemainRealSec, scaledGrowOutputsPreview, smoothCurrentGameSec } from "./environment-ui";

describe("environment-ui", () => {
  it("smoothCurrentGameSec 依 serverRealTime 外插", () => {
    const server = "2020-01-01T00:00:00.000Z";
    const base = smoothCurrentGameSec(1000, 60, server, Date.parse(server));
    expect(base).toBe(1000);
    const later = smoothCurrentGameSec(1000, 60, server, Date.parse(server) + 10_000);
    expect(later).toBe(1000 + 10 * 60);
  });

  it("fallowRemainRealSec 倒數為遊戲秒差除以 timeScale", () => {
    const server = "2020-01-01T00:00:00.000Z";
    const now = Date.parse(server);
    expect(fallowRemainRealSec(1900, 1000, 60, server, now)).toBe(15);
  });

  it("scaledGrowOutputsPreview 只縮放 grow 規則產出", () => {
    const outs = [{ item_id: "item_wheat", qty: 4 }];
    expect(scaledGrowOutputsPreview("rule_grow_wheat", outs, 1.15)[0].qty).toBe(5);
    expect(scaledGrowOutputsPreview("rule_mix_feed", outs, 1.15)[0].qty).toBe(4);
    expect(scaledGrowOutputsPreview("rule_grow_wheat", outs, 0.75)[0].qty).toBe(3);
  });
});
