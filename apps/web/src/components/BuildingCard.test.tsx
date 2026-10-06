import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  demoFieldIdle,
  demoInventoryShortWater,
  demoMillRunning,
  growWheatDefault,
  mixFeedDefault,
} from "../prb-demo/fixtures";
import { BuildingCard } from "./BuildingCard";

const baseProps = {
  options: [growWheatDefault, mixFeedDefault],
  inventory: demoInventoryShortWater,
  timeScale: 60,
  pending: false,
  onSelectMethod: vi.fn(),
  onStart: vi.fn(),
  onStop: vi.fn(),
  onCollect: vi.fn(),
};

describe("BuildingCard U4 stop confirm", () => {
  it("stop is only enabled when running", () => {
    const { rerender } = render(
      <BuildingCard {...baseProps} building={demoFieldIdle} selectedId={growWheatDefault.id} selected={growWheatDefault} />,
    );
    expect(screen.getByRole("button", { name: "停止" })).toBeDisabled();

    rerender(
      <BuildingCard
        {...baseProps}
        building={{ ...demoMillRunning, status: "running" }}
        selectedId={mixFeedDefault.id}
        selected={mixFeedDefault}
      />,
    );
    expect(screen.getByRole("button", { name: "停止" })).toBeEnabled();
  });

  it("cancel closes dialog without stop; confirm calls onStop once", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(
      <BuildingCard
        {...baseProps}
        building={demoMillRunning}
        selectedId={mixFeedDefault.id}
        selected={mixFeedDefault}
        onStop={onStop}
      />,
    );

    await user.click(screen.getByRole("button", { name: "停止" }));
    expect(screen.getByRole("dialog")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onStop).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "停止" }));
    await user.click(screen.getByRole("button", { name: "確認停止" }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});

describe("BuildingCard U7 method lock", () => {
  it("locks select to building.methodId when running or ready", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoMillRunning}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select.value).toBe("method_mix_feed_default");
  });

  it("unlocks select when idle", () => {
    render(
      <BuildingCard {...baseProps} building={demoFieldIdle} selectedId={growWheatDefault.id} selected={growWheatDefault} />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).not.toBeDisabled();
    expect(select.value).toBe("method_grow_wheat_default");
  });

  it("locks select when ready", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={{
          ...demoFieldIdle,
          status: "ready",
          methodId: growWheatDefault.id,
          bufferedOutputs: { item_wheat: 2 },
        }}
        selectedId={mixFeedDefault.id}
        selected={mixFeedDefault}
      />,
    );
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select.value).toBe("method_grow_wheat_default");
  });
});
