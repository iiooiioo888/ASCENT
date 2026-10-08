import { ITEM_META } from "../meta";
import { formatQuantity } from "../format";
import type { InvRow } from "../types";
import { inventoryQtyMap } from "../inventory";

const INGOT_CHIPS = [
  { itemId: "item_copper_ingot", testId: "hud-copper-ingot", className: "chip chip-copper-ingot" },
  { itemId: "item_silver_ingot", testId: "hud-silver-ingot", className: "chip chip-silver-ingot" },
  { itemId: "item_gold_ingot", testId: "hud-gold-ingot", className: "chip chip-gold-ingot" },
] as const;

function ingotChipLabel(itemId: string, qty: number): string {
  const icon = ITEM_META[itemId]?.icon ?? "📦";
  return `${icon} ${formatQuantity(qty)}`;
}

type Props = {
  inventory: InvRow[];
  /** 結算銅錠餘額（優先 market.gold，與商行一致）。 */
  copperQty?: number;
};

export function IngotHud({ inventory, copperQty }: Props) {
  const stock = inventoryQtyMap(inventory);
  return (
    <>
      {INGOT_CHIPS.map(({ itemId, testId, className }) => {
        const qty =
          itemId === "item_copper_ingot" && copperQty !== undefined
            ? copperQty
            : stock.get(itemId) ?? 0;
        const meta = ITEM_META[itemId];
        return (
          <span
            key={itemId}
            className={className}
            data-testid={testId}
            title={meta?.name ?? itemId}
          >
            {ingotChipLabel(itemId, qty)}
          </span>
        );
      })}
    </>
  );
}
