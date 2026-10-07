import { formatQuantity } from "../format";
import { ITEM_META, itemLabel } from "../meta";
import { MARKET_COPY } from "../marketCopy";

type Props = {
  itemId: string;
  side: "sell" | "buy";
  unitPrice: number;
  holding: number;
  quantity: number;
  goldBalance: number;
  pending: boolean;
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
  onQuantityChange,
  onAction,
}: Props) {
  const meta = ITEM_META[itemId] ?? { name: itemLabel(itemId), icon: "📦" };
  const subtotal = unitPrice * quantity;
  const maxQty = side === "sell" ? Math.max(0, Math.floor(holding)) : Math.max(1, Math.floor(goldBalance / unitPrice));
  const outOfStock = side === "sell" && holding <= 0;
  const insufficientGold = side === "buy" && goldBalance < unitPrice * quantity;
  const disabled = pending || outOfStock || insufficientGold || quantity < 1;

  const clamp = (n: number) => Math.max(1, Math.min(maxQty || 1, n));

  return (
    <div
      className={[
        "market-row",
        side,
        outOfStock ? "out-of-stock" : "",
        insufficientGold ? "insufficient-gold" : "",
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
        <div className="market-subtotal" aria-label="小計">
          🪙{formatQuantity(subtotal)}
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
    </div>
  );
}
