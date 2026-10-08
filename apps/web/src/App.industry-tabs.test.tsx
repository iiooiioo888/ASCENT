import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Building, GameState } from "./types";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("./api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./api")>();
  return {
    ...actual,
    api: apiMock,
  };
});

import App from "./App";
import { INDUSTRY_TABS } from "./industries";
import { INDUSTRY_PACK_EMPTY } from "./productCopy";
import { withMarketApiRoute } from "./test/marketFixture";
import type { InvRow } from "./types";

function building(id: string, buildingDefId: string, name: string): Building {
  return {
    id,
    status: "idle",
    buildingDefId,
    buildingDef: { name, allowedRuleIds: [] },
    methodId: null,
    queue: [],
    bufferedOutputs: {},
  };
}

function inv(itemId: string, quantity: string): InvRow {
  return { itemId, quantity, item: { code: itemId, layer: "T", derivedTier: 1 } };
}

function industryState(): GameState {
  return {
    time: { displayGameTime: 3600, timeScale: 60, serverRealTime: "2026-01-01T00:00:00.000Z" },
    inventory: [inv("item_wheat", "3"), inv("item_iron_ore", "2"), inv("item_log", "1"), inv("item_gold", "10")],
    buildings: [building("pb_field", "bdef_field", "田"), building("pb_mine", "bdef_mine", "礦坑")],
    methods: [],
    buildingDefs: [
      { id: "bdef_field", name: "田", code: "field" },
      { id: "bdef_mine", name: "礦坑", code: "mine" },
      { id: "bdef_forest", name: "林地", code: "forest" },
      { id: "bdef_kiln", name: "窯", code: "kiln" },
      { id: "bdef_workshop", name: "工坊", code: "workshop" },
      { id: "bdef_boiler", name: "鍋爐", code: "boiler" },
    ],
  };
}

describe("industry tabs", () => {
  beforeEach(() => {
    apiMock.mockReset();
    const state = industryState();
    apiMock.mockImplementation(
      withMarketApiRoute(async (path: string) => {
        if (path === "/api/v1/state") return state;
        throw new Error(`unexpected api call: ${path}`);
      }),
    );
  });

  it("gives each industry its own tab and hides the others", async () => {
    const user = userEvent.setup();
    render(<App />);

    for (const tab of INDUSTRY_TABS) {
      expect(await screen.findByRole("tab", { name: tab.label })).toBeInTheDocument();
    }

    const pack = () => within(screen.getByTestId("industry-pack"));

    expect(screen.getByRole("tab", { name: "農業" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "農業產品" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "田" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "礦坑" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "放置林地" })).not.toBeInTheDocument();
    expect(screen.getByText("飼料")).toBeInTheDocument();
    expect(pack().getByLabelText("小麥 3")).toBeInTheDocument();
    expect(pack().queryByLabelText("鐵礦 2")).not.toBeInTheDocument();
    expect(pack().queryByText("金幣")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "礦業" }));
    expect(screen.getByRole("tab", { name: "礦業" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "礦業產品" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "礦坑" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "田" })).not.toBeInTheDocument();
    expect(screen.getByText("鋼")).toBeInTheDocument();
    expect(screen.queryByText("飼料")).not.toBeInTheDocument();
    expect(pack().getByLabelText("鐵礦 2")).toBeInTheDocument();
    expect(pack().queryByLabelText("小麥 3")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "林木" }));
    expect(screen.getByRole("button", { name: "放置林地" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "田" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "礦坑" })).not.toBeInTheDocument();
    expect(pack().getByLabelText("原木 1")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "化工" }));
    expect(screen.getByRole("button", { name: "放置窯" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "放置林地" })).not.toBeInTheDocument();
    expect(screen.getByText(INDUSTRY_PACK_EMPTY)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "工業" }));
    expect(screen.getByRole("button", { name: "放置工坊" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "放置窯" })).not.toBeInTheDocument();
    expect(screen.getByText("蒸汽機")).toBeInTheDocument();
    expect(screen.queryByText("蒸汽")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "能源" }));
    expect(screen.getByRole("button", { name: "放置鍋爐" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "放置工坊" })).not.toBeInTheDocument();
    expect(screen.getByText("蒸汽")).toBeInTheDocument();
    expect(screen.queryByText("蒸汽機")).not.toBeInTheDocument();
  });
});
