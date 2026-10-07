import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkforceHud } from "./WorkforceHud";

const opsCosts = {
  hireCostGold: 8,
  laborCostPerStart: 1,
  wageByBuilding: {},
  haulByBuilding: {},
};

describe("WorkforceHud", () => {
  it("shows free/hired chip and hire preview", () => {
    render(
      <WorkforceHud
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        opsCosts={opsCosts}
        gold={10}
        pending={false}
        onHire={vi.fn()}
      />,
    );
    expect(screen.getByTestId("hud-workforce-chip")).toHaveTextContent("👷 1/1");
    expect(screen.getByRole("button", { name: /僱工/ })).toHaveTextContent("支付 🪙8");
  });

  it("disables hire when gold insufficient or at cap", () => {
    const { rerender } = render(
      <WorkforceHud
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        opsCosts={opsCosts}
        gold={7}
        pending={false}
        onHire={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /僱工/ })).toBeDisabled();

    rerender(
      <WorkforceHud
        workforce={{ hired: 4, busy: 0, free: 4, maxHired: 4 }}
        opsCosts={opsCosts}
        gold={100}
        pending={false}
        onHire={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /僱工/ })).toBeDisabled();
  });

  it("calls onHire when enabled", async () => {
    const user = userEvent.setup();
    const onHire = vi.fn();
    render(
      <WorkforceHud
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        opsCosts={opsCosts}
        gold={10}
        pending={false}
        onHire={onHire}
      />,
    );
    await user.click(screen.getByRole("button", { name: /僱工/ }));
    expect(onHire).toHaveBeenCalledOnce();
  });
});
