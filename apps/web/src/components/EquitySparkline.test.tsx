import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EquitySparkline } from "./EquitySparkline";

describe("EquitySparkline", () => {
  it("renders empty placeholder without crashing", () => {
    const { container } = render(<EquitySparkline history={[]} />);
    expect(container.querySelector('[data-testid="equity-sparkline-empty"]')).toBeTruthy();
  });

  it("renders polyline for multi-point history", () => {
    const history = [
      { t: 1, price: 10 },
      { t: 2, price: 12 },
      { t: 3, price: 11 },
    ];
    const { container } = render(<EquitySparkline history={history} />);
    expect(container.querySelector('[data-testid="equity-sparkline"] polyline')).toBeTruthy();
  });

  it("renders single-point history without crashing", () => {
    const { container } = render(<EquitySparkline history={[{ t: 1, price: 10 }]} />);
    expect(container.querySelector('[data-testid="equity-sparkline"]')).toBeTruthy();
  });
});
