import { formatQuantity } from "../format";
import { layoutInventoryRows } from "../inventory-display";
import { ITEM_META } from "../meta";
import { LOW_STOCK_THRESHOLD } from "../resource-loop-copy";
import type { InvRow } from "../types";

const LOW_STOCK_ITEM_IDS = new Set(["item_water", "item_seed_wheat"]);

function isLowStock(itemId: string, qty: number): boolean {
  return LOW_STOCK_ITEM_IDS.has(itemId) && qty > 0 && qty <= LOW_STOCK_THRESHOLD;
}

type ItemTileProps = {
  row: InvRow;
  highlightItemIds?: Set<string>;
  compact?: boolean;
};

function InventoryItemTile({ row, highlightItemIds, compact = false }: ItemTileProps) {
  const qty = Number(row.quantity);
  const meta = ITEM_META[row.itemId] ?? { name: row.item.code, icon: "📦" };
  return (
    <div
      key={row.itemId}
      aria-label={`${meta.name} ${formatQuantity(qty)}`}
      title={meta.name}
      className={[
        "item",
        compact ? "item-compact" : "",
        qty <= 0 ? "empty" : "",
        isLowStock(row.itemId, qty) ? "low-stock" : "",
        highlightItemIds?.has(row.itemId) ? "highlight" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="icon">{meta.icon}</div>
      <div className="qty qty-emphasis">{formatQuantity(qty)}</div>
      <div className="name">{meta.name}</div>
    </div>
  );
}

type Props = {
  inventory: InvRow[];
  highlightItemIds?: Set<string>;
  title?: string;
  emptyText?: string;
};

export function Inventory({ inventory, highlightItemIds, title = "背包", emptyText }: Props) {
  const { pinned, sections } = layoutInventoryRows(inventory);
  const hasContent = pinned.length > 0 || sections.length > 0;

  return (
    <section className="pack pack-rich" data-testid="industry-pack">
      <h2>{title}</h2>
      {inventory.length === 0 && emptyText ? <p className="pack-empty">{emptyText}</p> : null}
      {!hasContent && inventory.length > 0 ? (
        <div className="items">
          {inventory.map((row) => (
            <InventoryItemTile key={row.itemId} row={row} highlightItemIds={highlightItemIds} />
          ))}
        </div>
      ) : null}
      {pinned.length > 0 ? (
        <div className="inventory-pinned" data-testid="inventory-pinned">
          {pinned.map((row) => (
            <InventoryItemTile key={row.itemId} row={row} highlightItemIds={highlightItemIds} compact />
          ))}
        </div>
      ) : null}
      {sections.map((section) => (
        <div key={section.bucket} className="inventory-section" data-testid={`inventory-section-${section.bucket}`}>
          <h3 className="inventory-section-label">{section.label}</h3>
          <div className="items">
            {section.rows.map((row) => (
              <InventoryItemTile key={row.itemId} row={row} highlightItemIds={highlightItemIds} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
