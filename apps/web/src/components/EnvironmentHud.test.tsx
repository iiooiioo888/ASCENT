import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnvironmentHud } from "./EnvironmentHud";

describe("EnvironmentHud", () => {
  it("顯示天氣 chip 與倍率", () => {
    render(<EnvironmentHud environment={{ weather: "rain", yieldMult: 1.15 }} />);
    const chip = screen.getByTestId("hud-weather-chip");
    expect(chip).toHaveTextContent("雨");
    expect(chip).toHaveTextContent("115%");
  });

  it("晴且倍率 1 時不附百分比", () => {
    render(<EnvironmentHud environment={{ weather: "fair", yieldMult: 1 }} />);
    expect(screen.getByTestId("hud-weather-chip")).toHaveTextContent("晴");
    expect(screen.getByTestId("hud-weather-chip").textContent).not.toMatch(/%/);
  });
});
