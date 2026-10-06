import { formatQuantity } from "./format";
import { itemLabel } from "./meta";

/** Player-facing collect success line, e.g. "+2 小麥 +1 秸稈". */
export function formatCollectSuccess(buffered: Record<string, number>): string | null {
  const parts = Object.entries(buffered)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => `+${formatQuantity(qty)} ${itemLabel(itemId)}`);
  return parts.length ? parts.join(" ") : null;
}

export function collectHighlightItemIds(buffered: Record<string, number>): string[] {
  return Object.entries(buffered)
    .filter(([, qty]) => qty > 0)
    .map(([itemId]) => itemId);
}

/** How long success copy and inventory highlight stay visible after collect. */
export const SUCCESS_FEEDBACK_MS = 2500;
