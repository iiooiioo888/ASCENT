import { BUILDING_ICON } from "../meta";
import { INDUSTRY_CHAIN_ARIA_LABEL } from "../productCopy";
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

function renderNode(node: ChainNode, buildings: Building[]) {
  if (node.kind === "item") {
    const feedQtyHint = node.itemId === "item_feed" ? "chain-node item" : "chain-node item";
    return (
      <span key={node.itemId} className={feedQtyHint} title={node.label}>
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

type Props = {
  buildings: Building[];
};

export function IndustryChain({ buildings }: Props) {
  return (
    <div className="chain" aria-label={INDUSTRY_CHAIN_ARIA_LABEL}>
      <div className="chain-main">
        {MAIN_LINE.map((node, index) => (
          <span key={node.kind === "building" ? node.buildingDefId : node.itemId} className="chain-segment">
            {index > 0 ? <i className="chain-arrow" aria-hidden>→</i> : null}
            {renderNode(node, buildings)}
          </span>
        ))}
      </div>
      <div className="chain-branch" aria-hidden>
        <span className="chain-branch-label">磨坊支線</span>
        <i className="chain-arrow">↘</i>
        {renderNode(FEED_BRANCH, buildings)}
      </div>
    </div>
  );
}
