import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const stylePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../style.css");
const mobileBlock = readFileSync(stylePath, "utf8").match(/@media \(max-width: 480px\) \{[\s\S]*?\n\}/)?.[0] ?? "";

describe("U14 mobile touch targets (CSS @media max-width 480px)", () => {
  it("includes 44px min size for all documented interactive selectors", () => {
    expect(mobileBlock).toContain("@media (max-width: 480px)");
    const required = [
      ".actions button",
      ".plot.empty button",
      "select",
      ".confirm-dialog-actions button",
      "button.loading-retry",
      ".offline-summary-dismiss",
    ];
    for (const selector of required) {
      expect(mobileBlock).toContain(selector);
    }
    expect(mobileBlock.match(/min-height:\s*44px/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(mobileBlock).toMatch(/\.settlement[\s\S]*grid-template-columns:\s*1fr/);
  });

  it("keeps horizontal overflow hidden on .world", () => {
    const full = readFileSync(stylePath, "utf8");
    expect(full).toMatch(/\.world\s*\{[^}]*overflow-x:\s*hidden/);
  });
});
