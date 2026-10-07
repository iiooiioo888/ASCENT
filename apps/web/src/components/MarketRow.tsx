import { formatQuantity } from "../format";
import { ITEM_META, itemLabel } from "../meta";
import { MARKET_COPY } from "../marketCopy";
import { OPS_DEPTH_COPY } from "../ops-depth-copy";
import type { SellTransportPreview } from "../ops-depth";

type Props = {
  itemId: string;
  side: "sell" | "buy";
  unitPrice: number;
  holding: number;
  quantity: number;
  goldBalance: number;
  pending: boolean;
  sellPreview?: SellTransportPreview | null;
  onQuantityChange: (next: number) => void;
  onAction: () => void;
};

export function MarketRow({
  itemId,
  side,
  unitPrice,
  holding,
  quantity,
  goldBalance,
  pending,
  sellPreview,
  onQuantityChange,
  onAction,
}: Props) {
  const meta = ITEM_META[itemId] ?? { name: itemLabel(itemId), icon: "📦" };
  const subtotal = unitPrice * quantity;
  const maxQty = side === "sell" ? Math.max(0, Math.floor(holding)) : Math.max(1, Math.floor(goldBalance / unitPrice));
  const outOfStock = side === "sell" && holding <= 0;
  const insufficientGold = side === "buy" && goldBalance < unitPrice * quantity;
  const transportTooHigh = side === "sell" && !!sellPreview?.transportTooHigh;
  const disabled = pending || outOfStock || insufficientGold || transportTooHigh || quantity < 1;

  const clamp = (n: number) => Math.max(1, Math.min(maxQty || 1, n));

  return (
    <div
      className={[
        "market-row",
        side,
        outOfStock ? "out-of-stock" : "",
        insufficientGold ? "insufficient-gold" : "",
        transportTooHigh ? "transport-too-high" : "",
        pending ? "pending" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={`market-row-${side}-${itemId}`}
    >
      <div className="market-row-main">
        <span className="market-row-icon" aria-hidden>{meta.icon}</span>
        <div className="market-row-text">
          <div className="market-row-name">{meta.name}</div>
          <div className="market-row-meta">
            {side === "sell" ? (
              <span>持有 {formatQuantity(holding)}</span>
            ) : (
              <span>單價 🪙{formatQuantity(unitPrice)}</span>
            )}
            <span className="market-row-price">
              {side === "sell" ? `單價 🪙${formatQuantity(unitPrice)}` : null}
            </span>
            {side === "sell" && sellPreview && sellPreview.transportFee > 0 ? (
              <span className="market-row-fee" data-testid="market-row-sell-fee">
                {OPS_DEPTH_COPY.haul} −🪙{formatQuantity(sellPreview.transportFee)}
              </span>
            ) : null}
            {side === "sell" && sellPreview ? (
              <span
                className={`market-row-net${transportTooHigh ? " shortage" : ""}`}
                data-testid="market-row-sell-net"
              >
                {OPS_DEPTH_COPY.net} 🪙{formatQuantity(sellPreview.netGold)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="market-row-controls">
        <div className="market-stepper" role="group" aria-label={`${meta.name} 數量`}>
          <button
            type="button"
            className="market-stepper-btn"
            disabled={disabled && !pending}
            onClick={() => onQuantityChange(clamp(quantity - 1))}
            aria-label={`減少 ${meta.name}`}
          >
            −
          </button>
          <span className="market-stepper-value" aria-live="polite">{formatQuantity(quantity)}</span>
          <button
            type="button"
            className="market-stepper-btn"
            disabled={(side === "sell" && quantity >= maxQty) || pending}
            onClick={() => onQuantityChange(clamp(quantity + 1))}
            aria-label={`增加 ${meta.name}`}
          >
            +
          </button>
        </div>
        <div className="market-subtotal" aria-label={side === "sell" ? "售價小計" : "小計"}>
          {side === "sell" ? `售價 🪙${formatQuantity(subtotal)}` : `🪙${formatQuantity(subtotal)}`}
        </div>
        <button
          type="button"
          className="market-action-btn"
          disabled={disabled}
          onClick={onAction}
        >
          {side === "sell" ? MARKET_COPY.sellCta : MARKET_COPY.buyCta}
        </button>
      </div>

      {outOfStock ? <p className="market-row-hint">{MARKET_COPY.needStock}</p> : null}
      {insufficientGold && !outOfStock ? <p className="market-row-hint">{MARKET_COPY.needGold}</p> : null}
      {transportTooHigh && !outOfStock ? (
        <p className="market-row-hint" data-testid="market-row-transport-hint">
          {OPS_DEPTH_COPY.sellTransportTooHigh}
        </p>
      ) : null}
    </div>
  );
}
