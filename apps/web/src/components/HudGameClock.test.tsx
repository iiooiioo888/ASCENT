import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HudGameClock } from "./HudGameClock";

describe("HudGameClock", () => {
  it("顯示精簡遊戲時鐘 chip", () => {
    render(
      <HudGameClock displayGameTime={3600} timeScale={60} serverRealTime="2026-01-01T00:00:00.000Z" />,
    );
    const chip = screen.getByTestId("hud-game-clock");
    expect(chip).toHaveClass("chip-hud-clock");
    expect(chip.textContent).toMatch(/^⏱ /);
  });
});
