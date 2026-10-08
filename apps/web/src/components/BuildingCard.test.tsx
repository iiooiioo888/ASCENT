import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  demoFieldIdle,
  demoInventoryShortWater,
  demoMillRunning,
  growWheatDefault,
  mixFeedDefault,
  raiseLivestockDefault,
  demoRanchIdle,
  bakeCakeDefault,
  demoFoodFactoryIdle,
} from "../prb-demo/fixtures";
import { BUILDING_ACTION_ERROR_COPY } from "../building-action-error";
import { demoSiloBuilding } from "../screenshot-harness/fixtures";
import { BuildingCard } from "./BuildingCard";
import { DEMO_SERVER_REAL_TIME } from "../test/demoTime";
import { FALLOW_ACTIVE_COPY } from "../environment-copy";
import { DEPLETION_CTA_MARKET } from "../productCopy";

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

const defaultOpsCosts = {
  hireCostGold: 8,
  laborCostPerStart: 1,
  wageByBuilding: { bdef_field: 1, bdef_mill: 2 },
  haulByBuilding: { bdef_field: 0, bdef_mill: 1 },
};

describe("BuildingCard OD ops precheck", () => {
  it("disables start when workforce free is zero", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        goldBalance={10}
        workforce={{ hired: 1, busy: 1, free: 0, maxHired: 4 }}
        opsCosts={defaultOpsCosts}
      />,
    );
    expect(screen.getByRole("button", { name: "開工" })).toBeDisabled();
    expect(screen.getByTestId("ops-cost-preview")).toHaveTextContent("人手 1");
  });

  it("disables start when gold cannot cover wage", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        goldBalance={0}
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        opsCosts={defaultOpsCosts}
      />,
    );
    expect(screen.getByRole("button", { name: "開工" })).toBeDisabled();
    expect(document.querySelector(".ops-cost-preview .shortage")).not.toBeNull();
  });

  it("shows go-market CTA when gold blocks start and calls onGoMarket", async () => {
    const user = userEvent.setup();
    const onGoMarket = vi.fn();
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        goldBalance={0}
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        opsCosts={defaultOpsCosts}
        onGoMarket={onGoMarket}
      />,
    );
    await user.click(screen.getByRole("button", { name: DEPLETION_CTA_MARKET }));
    expect(onGoMarket).toHaveBeenCalledOnce();
  });

  it("hides go-market CTA when start blocked only by labor", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        goldBalance={10}
        workforce={{ hired: 1, busy: 1, free: 0, maxHired: 4 }}
        opsCosts={defaultOpsCosts}
        onGoMarket={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: DEPLETION_CTA_MARKET })).not.toBeInTheDocument();
  });

  it("hides go-market CTA when inputs are short even if gold is low", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        goldBalance={0}
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 4 }}
        opsCosts={defaultOpsCosts}
        onGoMarket={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: DEPLETION_CTA_MARKET })).not.toBeInTheDocument();
  });
});

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
        actionError={{ message: "資源不足：水" }}
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

describe("BuildingCard AFK auto toggle", () => {
  it("shows auto switch default off and calls PATCH handler when enabled", async () => {
    const user = userEvent.setup();
    const onAutoToggle = vi.fn();
    render(
      <BuildingCard
        {...baseProps}
        building={{ ...demoFieldIdle, autoEnabled: false }}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        onAutoToggle={onAutoToggle}
      />,
    );
    const toggle = screen.getByRole("switch", { name: "田自動生產" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(onAutoToggle).toHaveBeenCalledWith(true);
  });

  it("reflects auto on state and turns off when clicked", async () => {
    const user = userEvent.setup();
    const onAutoToggle = vi.fn();
    render(
      <BuildingCard
        {...baseProps}
        building={{ ...demoFieldIdle, autoEnabled: true }}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        onAutoToggle={onAutoToggle}
      />,
    );
    const toggle = screen.getByRole("switch", { name: "田自動生產" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    expect(onAutoToggle).toHaveBeenCalledWith(false);
  });

  it("shows API pause reason text", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={{
          ...demoFieldIdle,
          autoEnabled: true,
          autoPauseReason: "自動已暫停：物料不足",
        }}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        onAutoToggle={vi.fn()}
      />,
    );
    expect(screen.getByTestId("auto-pause-reason")).toHaveTextContent("自動已暫停：物料不足");
  });

  it("hides auto toggle without onAutoToggle handler", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
      />,
    );
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("shows auto action errors separately from production errors", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        actionError={{ message: "資源不足：水" }}
        autoActionError={{ message: "操作失敗，請重試" }}
        onAutoToggle={vi.fn()}
      />,
    );
    const alerts = screen.getAllByRole("alert");
    expect(alerts.map((el) => el.textContent)).toEqual(["操作失敗，請重試", "資源不足：水"]);
  });

  it("selects auto method default null and calls handler with method id or null", async () => {
    const user = userEvent.setup();
    const onAutoMethodChange = vi.fn();
    render(
      <BuildingCard
        {...baseProps}
        building={demoRanchIdle}
        options={[raiseLivestockDefault]}
        selectedId={raiseLivestockDefault.id}
        selected={raiseLivestockDefault}
        inventory={baseInventory}
        onAutoToggle={vi.fn()}
        onAutoMethodChange={onAutoMethodChange}
      />,
    );
    const select = screen.getByRole("combobox", { name: "選擇牧場的掛機配方" });
    expect(select).toHaveValue("");
    await user.selectOptions(select, "method_raise_livestock_default");
    expect(onAutoMethodChange).toHaveBeenCalledWith("method_raise_livestock_default");
    await user.selectOptions(select, "預設");
    expect(onAutoMethodChange).toHaveBeenCalledWith(null);
  });

  it("food factory card shows icon label and bake cake recipe option", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFoodFactoryIdle}
        options={[bakeCakeDefault]}
        selectedId={bakeCakeDefault.id}
        selected={bakeCakeDefault}
        inventory={baseInventory}
        onAutoToggle={vi.fn()}
        onAutoMethodChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: "食品廠" })).toHaveTextContent("🧁");
    expect(screen.getByRole("combobox", { name: "選擇食品廠的生產方式" })).toHaveTextContent("焗蛋糕");
    expect(screen.getByRole("combobox", { name: "選擇食品廠的掛機配方" })).toBeInTheDocument();
  });

  it("ranch card shows icon label and raise livestock recipe option", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoRanchIdle}
        options={[raiseLivestockDefault]}
        selectedId={raiseLivestockDefault.id}
        selected={raiseLivestockDefault}
        inventory={baseInventory}
        onAutoToggle={vi.fn()}
        onAutoMethodChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: "牧場" })).toHaveTextContent("🐄");
    expect(screen.getByRole("combobox", { name: "選擇牧場的生產方式" })).toHaveTextContent("飼養禽畜");
    expect(screen.getByRole("combobox", { name: "選擇牧場的掛機配方" })).toBeInTheDocument();
  });

  it("shows auto method errors separately from auto toggle errors", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        onAutoToggle={vi.fn()}
        onAutoMethodChange={vi.fn()}
        autoActionError={{ message: "操作失敗，請重試" }}
        autoMethodActionError={{ message: BUILDING_ACTION_ERROR_COPY.METHOD_NOT_ALLOWED }}
      />,
    );
    const alerts = screen.getAllByRole("alert");
    expect(alerts.map((el) => el.textContent)).toEqual([
      BUILDING_ACTION_ERROR_COPY.METHOD_NOT_ALLOWED,
      "操作失敗，請重試",
    ]);
  });

  it("disables auto controls while auto or auto-method pending", () => {
    const ranchInventory = [
      ...baseInventory,
      {
        itemId: "item_feed",
        quantity: "5",
        item: { code: "item_feed", layer: "P", derivedTier: 1 },
      },
    ];
    const { rerender } = render(
      <BuildingCard
        {...baseProps}
        building={demoRanchIdle}
        options={[raiseLivestockDefault]}
        selectedId={raiseLivestockDefault.id}
        selected={raiseLivestockDefault}
        inventory={ranchInventory}
        goldBalance={10}
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 8 }}
        opsCosts={{ ...defaultOpsCosts, wageByBuilding: { ...defaultOpsCosts.wageByBuilding, bdef_ranch: 2 } }}
        autoPending={true}
        onAutoToggle={vi.fn()}
        onAutoMethodChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("switch", { name: "牧場自動生產" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "選擇牧場的掛機配方" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "開工" })).not.toBeDisabled();

    rerender(
      <BuildingCard
        {...baseProps}
        building={demoRanchIdle}
        options={[raiseLivestockDefault]}
        selectedId={raiseLivestockDefault.id}
        selected={raiseLivestockDefault}
        inventory={ranchInventory}
        goldBalance={10}
        workforce={{ hired: 1, busy: 0, free: 1, maxHired: 8 }}
        opsCosts={{ ...defaultOpsCosts, wageByBuilding: { ...defaultOpsCosts.wageByBuilding, bdef_ranch: 2 } }}
        autoMethodPending={true}
        onAutoToggle={vi.fn()}
        onAutoMethodChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("switch", { name: "牧場自動生產" })).not.toBeDisabled();
    expect(screen.getByRole("combobox", { name: "選擇牧場的掛機配方" })).toBeDisabled();
  });
});

describe("BuildingCard environment fallow", () => {
  it("休地時禁用開工並顯示倒數", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={{ ...demoFieldIdle, fallowUntil: 100_000 }}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        displayGameTime={99_000}
      />,
    );
    expect(screen.getByRole("button", { name: "開工" })).toBeDisabled();
    expect(screen.getByTestId("field-fallow-notice")).toHaveTextContent(FALLOW_ACTIVE_COPY);
  });

  it("雨天倍率預覽調整產出顯示", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        environmentYieldMult={1.15}
      />,
    );
    expect(screen.getByTestId("env-yield-preview")).toHaveTextContent("115%");
  });
});

describe("BuildingCard FE-RICH-1 density", () => {
  it("shows status badge and compact recipe row on idle field", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
      />,
    );
    expect(screen.getByText("閒置")).toHaveClass("badge", "idle");
    const row = screen.getByTestId("building-recipe-row");
    expect(row).toHaveTextContent("→");
    expect(row.textContent).toMatch(/小麥|種子|水/);
  });

  it("shows running badge and active recipe while mill is busy", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={demoMillRunning}
        options={[mixFeedDefault, growWheatDefault]}
        selectedId={mixFeedDefault.id}
        selected={mixFeedDefault}
        inventory={baseInventory}
      />,
    );
    expect(screen.getByText("生產中")).toHaveClass("badge", "running");
    expect(screen.getByTestId("building-recipe-row")).toHaveTextContent("→");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("keeps collect CTA enabled styling target when ready", () => {
    render(
      <BuildingCard
        {...baseProps}
        building={{ ...demoMillRunning, status: "ready", queue: [] }}
        options={[mixFeedDefault]}
        selectedId={mixFeedDefault.id}
        selected={mixFeedDefault}
        inventory={baseInventory}
      />,
    );
    expect(screen.getByText("待收取")).toHaveClass("badge", "ready");
    const collect = screen.getByRole("button", { name: "收取" });
    expect(collect).not.toBeDisabled();
    expect(collect).toHaveClass("collect");
  });

  it("folds workforce and ops preview into secondary details", async () => {
    const user = userEvent.setup();
    render(
      <BuildingCard
        {...baseProps}
        building={demoFieldIdle}
        selectedId={growWheatDefault.id}
        selected={growWheatDefault}
        inventory={baseInventory}
        goldBalance={10}
        workforce={{ hired: 1, busy: 1, free: 0, maxHired: 4 }}
        opsCosts={defaultOpsCosts}
      />,
    );
    const details = screen.getByTestId("building-card-details");
    expect(details).not.toHaveAttribute("open");
    await user.click(screen.getByText("次要資訊"));
    expect(details).toHaveAttribute("open");
    expect(screen.getByTestId("building-workforce-line")).toHaveTextContent("工位佔用：忙碌 1／已聘 1");
    expect(screen.getByTestId("ops-cost-preview")).toHaveTextContent("人手 1");
  });
});
