import { formatQuantity } from "../format";
import { ITEM_META } from "../meta";
import { itemPurposeHint } from "../productCopy";
import type { InvRow } from "../types";

type Props = {
  inventory: InvRow[];
  highlightItemIds?: ReadonlySet<string>;
};

export function Inventory({ inventory, highlightItemIds }: Props) {
  return (
    <section className="pack">
      <h2>背包</h2>
      <div className="items">
        {inventory.map((row) => {
          const qty = Number(row.quantity);
          const meta = ITEM_META[row.itemId] ?? { name: row.item.code, icon: "📦" };
          const purpose = itemPurposeHint(row.itemId);
          const qtyLabel = formatQuantity(qty);
          return (
            <div
              key={row.itemId}
              className={[
                qty <= 0 ? "item empty" : "item",
                highlightItemIds?.has(row.itemId) ? "highlight" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={`${meta.name} ${qtyLabel}`}
            >
              <div className="icon" aria-hidden>{meta.icon}</div>
              <div className="name">{meta.name}</div>
              <div className="qty" aria-hidden>{qtyLabel}</div>
              {purpose ? <div className="item-purpose">{purpose}</div> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
