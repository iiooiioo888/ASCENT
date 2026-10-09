import { ITEM_SETTLEMENT_CURRENCY_ID } from "@ascent/shared";
import { itemLabel } from "../meta";
import type { NpcOrderView } from "../types";

type Props = {
  orders: NpcOrderView[];
  pendingKeys: ReadonlySet<string>;
  onAccept: (orderId: string) => void;
};

export function npcOrderPendingKey(orderId: string): string {
  return `npc-order:${orderId}`;
}

export function NpcOrdersPanel({ orders, pendingKeys, onAccept }: Props) {
  if (orders.length === 0) return null;
  return (
    <section className="npc-orders" data-testid="npc-orders">
      <h4>商行訂單</h4>
      {orders.map((order) => {
        const pending = pendingKeys.has(npcOrderPendingKey(order.id));
        const need = order.requiredItems
          .map((row) => `${itemLabel(row.item_id)}×${row.quantity}`)
          .join("、");
        const reward = order.rewards
          .map((row) =>
            row.item_id === ITEM_SETTLEMENT_CURRENCY_ID
              ? `🟠${row.quantity}`
              : `${itemLabel(row.item_id)}×${row.quantity}`,
          )
          .join("、");
        return (
          <div key={order.id} className="npc-order-row">
            <p>
              交付 {need}，報酬 {reward}
            </p>
            <button type="button" disabled={pending} onClick={() => onAccept(order.id)}>
              交付
            </button>
          </div>
        );
      })}
    </section>
  );
}
