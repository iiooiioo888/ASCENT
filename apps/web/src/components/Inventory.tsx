import { formatQuantity } from "../format";
import { ITEM_META } from "../meta";
import { LOW_STOCK_THRESHOLD } from "../resource-loop-copy";
import type { InvRow } from "../types";

const LOW_STOCK_ITEM_IDS = new Set(["item_water", "item_seed_wheat"]);

function isLowStock(itemId: string, qty: number): boolean {
  return LOW_STOCK_ITEM_IDS.has(itemId) && qty > 0 && qty <= LOW_STOCK_THRESHOLD;
}

type Props = {
  inventory: InvRow[];
  highlightItemIds?: Set<string>;
  title?: string;
  emptyText?: string;
};

export function Inventory({ inventory, highlightItemIds, title = "背包", emptyText }: Props) {
  return (
    <section className="pack" data-testid="industry-pack">
      <h2>{title}</h2>
      {inventory.length === 0 && emptyText ? <p className="pack-empty">{emptyText}</p> : null}
      <div className="items">
        {inventory.map((row) => {
          const qty = Number(row.quantity);
          const meta = ITEM_META[row.itemId] ?? { name: row.item.code, icon: "📦" };
          return (
            <div
              key={row.itemId}
              aria-label={qty > 0 ? `${meta.name} ${formatQuantity(qty)}` : undefined}
              className={[
                "item",
                qty <= 0 ? "empty" : "",
                isLowStock(row.itemId, qty) ? "low-stock" : "",
                highlightItemIds?.has(row.itemId) ? "highlight" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="icon">{meta.icon}</div>
              <div className="name">{meta.name}</div>
              <div className="qty">{formatQuantity(qty)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
