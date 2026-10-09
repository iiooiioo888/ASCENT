import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DEPLETION_CTA_MARKET } from "../productCopy";
import { WorkforceHud } from "./WorkforceHud";

const opsCosts = {
  hireCostGold: 80,
  laborCostPerStart: 1,
  wageByBuilding: {},
  haulByBuilding: {},
};

describe("WorkforceHud", () => {
  it("shows hire preview on僱工按鈕", () => {
    render(
      <WorkforceHud
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        opsCosts={opsCosts}
        gold={100}
        pending={false}
        onHire={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /僱工/ })).toHaveTextContent("支付 🪙80");
  });

  it("disables hire when gold insufficient or at cap", () => {
    const { rerender } = render(
      <WorkforceHud
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        opsCosts={opsCosts}
        gold={79}
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

  it("shows go-market CTA when gold blocks hire and wires handler", async () => {
    const user = userEvent.setup();
    const onGoMarket = vi.fn();
    render(
      <WorkforceHud
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        opsCosts={opsCosts}
        gold={79}
        pending={false}
        onHire={vi.fn()}
        onGoMarket={onGoMarket}
      />,
    );
    const cta = screen.getByRole("button", { name: DEPLETION_CTA_MARKET });
    expect(cta).toBeInTheDocument();
    await user.click(cta);
    expect(onGoMarket).toHaveBeenCalledOnce();
  });

  it("hides go-market CTA when hire blocked only by cap", () => {
    render(
      <WorkforceHud
        workforce={{ hired: 4, busy: 0, free: 4, maxHired: 4 }}
        opsCosts={opsCosts}
        gold={0}
        pending={false}
        onHire={vi.fn()}
        onGoMarket={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: DEPLETION_CTA_MARKET })).not.toBeInTheDocument();
  });

  it("calls onHire when enabled", async () => {
    const user = userEvent.setup();
    const onHire = vi.fn();
    render(
      <WorkforceHud
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        opsCosts={opsCosts}
        gold={100}
        pending={false}
        onHire={onHire}
      />,
    );
    await user.click(screen.getByRole("button", { name: /僱工/ }));
    expect(onHire).toHaveBeenCalledOnce();
  });
});
