import { BUILDING_ICON } from "../meta";
import { INDUSTRY_CHAIN_ARIA_BY_ID } from "../productCopy";
import type { IndustryId } from "../industries";
import type { Building } from "../types";

type ChainBuildingNode = {
  kind: "building";
  buildingDefId: string;
  label: string;
};

type ChainItemNode = {
  kind: "item";
  itemId: string;
  label: string;
  icon: string;
};

type ChainNode = ChainBuildingNode | ChainItemNode;

const MAIN_LINE: ChainNode[] = [
  { kind: "building", buildingDefId: "bdef_field", label: "田" },
  { kind: "building", buildingDefId: "bdef_mill", label: "磨坊" },
  { kind: "building", buildingDefId: "bdef_oven", label: "爐" },
  { kind: "item", itemId: "item_bread", label: "麵包", icon: "🍞" },
];

const FEED_BRANCH: ChainItemNode = {
  kind: "item",
  itemId: "item_feed",
  label: "飼料",
  icon: "🧺",
};

const ENGINE_BRANCH: ChainItemNode = {
  kind: "item",
  itemId: "item_engine",
  label: "蒸汽機",
  icon: "🚂",
};

const CAKE_BRANCH: ChainNode[] = [
  { kind: "item", itemId: "item_flour", label: "麵粉", icon: "🥣" },
  { kind: "item", itemId: "item_egg", label: "雞蛋", icon: "🥚" },
  { kind: "item", itemId: "item_milk", label: "牛奶", icon: "🥛" },
  { kind: "building", buildingDefId: "bdef_food_factory", label: "食品廠" },
  { kind: "item", itemId: "item_cake", label: "蛋糕", icon: "🍰" },
];

const AGRICULTURE_BRANCH: ChainNode[] = [
  FEED_BRANCH,
  { kind: "building", buildingDefId: "bdef_ranch", label: "牧場" },
  { kind: "item", itemId: "item_egg", label: "雞蛋", icon: "🥚" },
  { kind: "item", itemId: "item_milk", label: "牛奶", icon: "🥛" },
];

type ChainBranch = { label: string; nodes: ChainNode[] };

const BRANCHES: Partial<Record<IndustryId, ChainBranch[]>> = {
  agriculture: [{ label: "磨坊支線", nodes: AGRICULTURE_BRANCH }],
  industry: [
    { label: "蛋糕鏈", nodes: CAKE_BRANCH },
    { label: "機械廠支線", nodes: [ENGINE_BRANCH] },
  ],
};

const LINES: Record<Exclude<IndustryId, "agriculture">, ChainNode[]> = {
  mining: [
    { kind: "building", buildingDefId: "bdef_mine", label: "礦坑" },
    { kind: "building", buildingDefId: "bdef_smelter", label: "冶煉爐" },
    { kind: "item", itemId: "item_steel", label: "鋼", icon: "⚙️" },
  ],
  timber: [
    { kind: "building", buildingDefId: "bdef_forest", label: "林地" },
    { kind: "item", itemId: "item_log", label: "原木", icon: "🪵" },
  ],
  chemical: [
    { kind: "building", buildingDefId: "bdef_kiln", label: "窯" },
    { kind: "building", buildingDefId: "bdef_chem_works", label: "化工廠" },
    { kind: "item", itemId: "item_fertilizer", label: "肥料", icon: "🌱" },
  ],
  industry: [
    { kind: "building", buildingDefId: "bdef_workshop", label: "工坊" },
    { kind: "building", buildingDefId: "bdef_machine_shop", label: "機械廠" },
    { kind: "item", itemId: "item_machine", label: "機械", icon: "🏭" },
  ],
  energy: [
    { kind: "building", buildingDefId: "bdef_boiler", label: "鍋爐" },
    { kind: "item", itemId: "item_steam", label: "蒸汽", icon: "💨" },
  ],
};

function statusForBuilding(buildings: Building[], buildingDefId: string): string {
  const match = buildings.find((b) => b.buildingDefId === buildingDefId);
  if (!match) return "missing";
  return match.status;
}

function nodeClass(status: string): string {
  if (status === "running") return "chain-node running";
  if (status === "ready") return "chain-node ready";
  if (status === "missing") return "chain-node missing";
  return "chain-node idle";
}

function nodeKey(node: ChainNode): string {
  return node.kind === "building" ? node.buildingDefId : node.itemId;
}

function renderNode(node: ChainNode, buildings: Building[]) {
  if (node.kind === "item") {
    return (
      <span key={node.itemId} className="chain-node item" title={node.label}>
        <span aria-hidden>{node.icon}</span> {node.label}
      </span>
    );
  }

  const status = statusForBuilding(buildings, node.buildingDefId);
  const icon = BUILDING_ICON[node.buildingDefId] ?? "🏠";
  return (
    <span
      key={node.buildingDefId}
      className={nodeClass(status)}
      title={`${node.label} · ${status === "missing" ? "未放置" : status}`}
    >
      <span aria-hidden>{icon}</span> {node.label}
    </span>
  );
}

function renderLine(nodes: ChainNode[], buildings: Building[]) {
  return nodes.map((node, index) => (
    <span key={nodeKey(node)} className="chain-segment">
      {index > 0 ? (
        <i className="chain-arrow" aria-hidden>
          →
        </i>
      ) : null}
      {renderNode(node, buildings)}
    </span>
  ));
}

type Props = {
  buildings: Building[];
  industry?: IndustryId;
};

export function IndustryChain({ buildings, industry = "agriculture" }: Props) {
  const line = industry === "agriculture" ? MAIN_LINE : LINES[industry];
  const branches = BRANCHES[industry] ?? [];
  return (
    <div className="chain" aria-label={INDUSTRY_CHAIN_ARIA_BY_ID[industry]}>
      <div className="chain-main">{renderLine(line, buildings)}</div>
      {branches.map((branch) => (
        <div key={branch.label} className="chain-branch">
          <span className="chain-branch-label">{branch.label}</span>
          <i className="chain-arrow" aria-hidden>
            ↘
          </i>
          {renderLine(branch.nodes, buildings)}
        </div>
      ))}
    </div>
  );
}
