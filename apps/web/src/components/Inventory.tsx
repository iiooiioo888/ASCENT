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
};

export function Inventory({ inventory, highlightItemIds }: Props) {
  return (
    <section className="pack">
      <h2>背包</h2>
      <div className="items">
        {inventory.map((row) => {
          const qty = Number(row.quantity);
          const meta = ITEM_META[row.itemId] ?? { name: row.item.code, icon: "📦" };
          return (
            <div
              key={row.itemId}
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
