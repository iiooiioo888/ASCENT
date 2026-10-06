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
import { demoSiloBuilding } from "../screenshot-harness/fixtures";
import { BuildingCard } from "./BuildingCard";
import { DEMO_SERVER_REAL_TIME } from "../test/demoTime";

const baseInventory = [
  {
    itemId: "item_seed_wheat",
    quantity: "40",
    item: { code: "item_seed_wheat", layer: "T", derivedTier: 0 },
  },
  {
    itemId: "item_water",
    quantity: "80",
    item: { code: "item_water", layer: "T", derivedTier: 0 },
  },
];

const baseProps = {
  options: [growWheatDefault, mixFeedDefault],
  inventory: demoInventoryShortWater,
  timeScale: 60,
  serverRealTime: DEMO_SERVER_REAL_TIME,
  pending: false,
  onSelectMethod: vi.fn(),
  onStart: vi.fn(),
  onStop: vi.fn(),
  onCollect: vi.fn(),
};

const fieldMethodSelectName = "選擇田的生產方式";
const millMethodSelectName = "選擇磨坊的生產方式";

describe("BuildingCard U2 inventory precheck", () => {
  it("disables start and renders shortage text when water is short", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
      />,
    );

    expect(screen.getByRole("button", { name: "開工" })).toBeDisabled();
    const shortage = document.querySelector(".recipe-shortages .shortage");
    expect(shortage).not.toBeNull();
    expect(shortage?.textContent).toMatch(/0\.5／1/);
  });
});

describe("BuildingCard U4 stop confirm", () => {
  it("stop is disabled for idle and ready, enabled only when running", () => {
    const { rerender } = render(
      <BuildingCard {...baseProps} building={demoFieldIdle} selectedId={growWheatDefault.id} selected={growWheatDefault} />,
    );
    expect(screen.getByRole("button", { name: "停止" })).toBeDisabled();

    rerender(
      <BuildingCard
        {...baseProps}
        building={{
          ...demoFieldIdle,
          status: "ready",
          methodId: growWheatDefault.id,
          bufferedOutputs: { item_wheat: 2 },
        }}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
      />,
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

  it("stop stays enabled while running even with empty inventory (U6 does not block U4)", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoMillRunning}
        inventory={[]}
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
    const select = screen.getByRole("combobox", { name: millMethodSelectName }) as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select.value).toBe("method_mix_feed_default");
  });

  it("unlocks select when idle", () => {
    render(
      <BuildingCard {...baseProps} building={demoFieldIdle} selectedId={growWheatDefault.id} selected={growWheatDefault} />,
    );
    const select = screen.getByRole("combobox", { name: fieldMethodSelectName }) as HTMLSelectElement;
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
    const select = screen.getByRole("combobox", { name: fieldMethodSelectName }) as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select.value).toBe("method_grow_wheat_default");
  });
});

describe("BuildingCard U12 silo (legacy mode)", () => {
  it("does not render production action buttons for silo", () => {
    render(
      <BuildingCard
        building={demoSiloBuilding}
        options={[]}
        inventory={baseInventory}
        selectedId={undefined}
        selected={undefined}
        timeScale={60}
        serverRealTime={DEMO_SERVER_REAL_TIME}
        pending={false}
        onSelectMethod={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onCollect={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "開工" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "停止" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "收取" })).not.toBeInTheDocument();
  });
});

describe("BuildingCard a11y (U15)", () => {
  it("associates method select with a visible label", () => {
    render(
      <BuildingCard
        building={demoFieldIdle}
        options={[growWheatDefault]}
        inventory={baseInventory}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        timeScale={60}
        serverRealTime={DEMO_SERVER_REAL_TIME}
        pending={false}
        onSelectMethod={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onCollect={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: fieldMethodSelectName })).toBeInTheDocument();
    expect(screen.getByText(fieldMethodSelectName)).toHaveAttribute("for", "method-select-demo-field");
  });

  it("exposes progressbar when running", () => {
    const serverRealTime = new Date(Date.now() - 30_000).toISOString();
    const running = {
      ...demoFieldIdle,
      status: "running" as const,
      methodId: growWheatDefault.id,
      queue: [{ elapsedGameSec: 0, durationGameSec: 3600 }],
    };
    render(
      <BuildingCard
        building={running}
        options={[growWheatDefault]}
        inventory={baseInventory}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        timeScale={60}
        serverRealTime={serverRealTime}
        pending={false}
        onSelectMethod={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onCollect={vi.fn()}
      />,
    );

    const bar = screen.getByRole("progressbar", { name: "田生產進度 50%" });
    expect(bar).toHaveAttribute("aria-valuenow", "50");
  });

  it("announces action errors with role alert", () => {
    render(
      <BuildingCard
        building={demoFieldIdle}
        options={[growWheatDefault]}
        inventory={baseInventory}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        timeScale={60}
        serverRealTime={DEMO_SERVER_REAL_TIME}
        actionError="資源不足：水"
        pending={false}
        onSelectMethod={vi.fn()}
        onStart={vi.fn()}
        onStop={vi.fn()}
        onCollect={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("資源不足：水");
  });
});
