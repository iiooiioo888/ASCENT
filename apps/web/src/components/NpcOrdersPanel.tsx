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
  return (
    <section className="npc-orders" data-testid="npc-orders">
      <h4>訂單板</h4>
      <p className="npc-orders-hint">接單就要少留一點種。過期是錯過的銅錠，不是懲罰骰子。</p>
      {orders.length === 0 ? <p className="npc-orders-empty">本小時沒有新單，等下一桶刷新。</p> : null}
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
        const title = order.label ? `${order.label}` : "訂單";
        return (
          <div key={order.id} className="npc-order-row" data-tier={order.tier ?? 1}>
            <p>
              {title}：交付 {need}，報酬 {reward}
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
