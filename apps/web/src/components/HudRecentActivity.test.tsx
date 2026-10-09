import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HudRecentActivity } from "./HudRecentActivity";

describe("HudRecentActivity", () => {
  it("顯示截斷後的最近動態 chip", () => {
    render(<HudRecentActivity message="已售出 麵包×1，實收 🟠7" />);
    const chip = screen.getByTestId("hud-recent-activity");
    expect(chip).toHaveAttribute("title", "已售出 麵包×1，實收 🟠7");
    expect(chip.textContent).toMatch(/^📣 /);
  });

  it("空字串不渲染", () => {
    const { container } = render(<HudRecentActivity message="   " />);
    expect(container).toBeEmptyDOMElement();
  });
});
