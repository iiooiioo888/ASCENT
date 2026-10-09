import { describe, expect, it } from "vitest";
import { formatProfitSimTable, profitSimRows } from "./balance-sim";

describe("利潤試算", () => {
  it("種麵包與煉鋼迴路淨利為正且可印表", () => {
    const rows = profitSimRows();
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.cycleGameSec).toBeGreaterThan(0);
      expect(row.copperOut).toBeGreaterThan(0);
      expect(row.copperNet).toBeGreaterThan(0);
    }
    const table = formatProfitSimTable(rows);
    expect(table).toContain("種→磨→麵→烤");
    expect(table).toContain("鐵礦→鐵錠→鋼");
  });
});
