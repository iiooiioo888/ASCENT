import { formatQuantity } from "../format";
import { ITEM_META } from "../meta";
import type { InvRow } from "../types";

type Props = {
  inventory: InvRow[];
};

export function Inventory({ inventory }: Props) {
  return (
    <section className="pack">
      <h2>背包</h2>
      <div className="items">
        {inventory.map((row) => {
          const qty = Number(row.quantity);
          const meta = ITEM_META[row.itemId] ?? { name: row.item.code, icon: "📦" };
          return (
            <div key={row.itemId} className={qty <= 0 ? "item empty" : "item"}>
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
