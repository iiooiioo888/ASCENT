import {
  commodityBuyTotal,
  commoditySellFeeTooHigh,
  commoditySellNet,
  maxCommodityBuyQty,
  type CommodityListing,
  type CommoditiesSnapshot,
} from "../commodities";
import { COMMODITY_COPY } from "../commodityCopy";
import { formatQuantity } from "../format";
import { ITEM_META, itemLabel } from "../meta";
import { formatCommodityChange } from "../sparkline";
import { Sparkline } from "./Sparkline";

type Props = {
  listing: CommodityListing;
  snapshot: CommoditiesSnapshot;
  quantity: number;
  pendingBuy: boolean;
  pendingSell: boolean;
  onQuantityChange: (next: number) => void;
  onBuy: () => void;
  onSell: () => void;
};

export function CommodityRow({
  listing,
  snapshot,
  quantity,
  pendingBuy,
  pendingSell,
  onQuantityChange,
  onBuy,
  onSell,
}: Props) {
  const { feeRate, minFeeGold, maxQtyPerOrder, gold } = snapshot;
  const unitPrice = listing.price;
  const holding = listing.holding;
  const meta = ITEM_META[listing.itemId] ?? { name: listing.name || itemLabel(listing.itemId), icon: "🛢️" };

  const maxSell = Math.min(Math.max(0, Math.floor(holding)), maxQtyPerOrder);
  const maxBuy = maxCommodityBuyQty(unitPrice, gold, maxQtyPerOrder, feeRate, minFeeGold);
  const maxQty = Math.max(maxSell, maxBuy, 1);

  const outOfStock = holding <= 0;
  const buyTotal = commodityBuyTotal(unitPrice, quantity, feeRate, minFeeGold);
  const insufficientGold = gold < buyTotal;
  const sellNet = commoditySellNet(unitPrice, quantity, feeRate, minFeeGold);
  const feeTooHigh = commoditySellFeeTooHigh(unitPrice, quantity, feeRate, minFeeGold);
  const overCap = quantity > maxQtyPerOrder;

  const buyDisabled = pendingBuy || pendingSell || insufficientGold || quantity < 1 || overCap || maxBuy < 1;
  const sellDisabled =
    pendingBuy || pendingSell || outOfStock || quantity < 1 || quantity > maxSell || feeTooHigh || overCap;

  const clamp = (n: number) => Math.max(1, Math.min(maxQty, n));

  return (
    <div
      className={[
        "commodity-row",
        outOfStock ? "out-of-stock" : "",
        insufficientGold ? "insufficient-gold" : "",
        feeTooHigh ? "fee-too-high" : "",
        pendingBuy || pendingSell ? "pending" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={`commodity-row-${listing.id}`}
    >
      <div className="commodity-row-head">
        <div className="commodity-row-title">
          <span className="commodity-row-icon" aria-hidden>{meta.icon}</span>
          <div>
            <div className="commodity-row-name">{meta.name}</div>
            <div className="commodity-row-stats">
              <span data-testid="commodity-row-price">
                {COMMODITY_COPY.price} 🪙{formatQuantity(unitPrice)}
              </span>
              <span data-testid="commodity-row-change">
                {COMMODITY_COPY.change} {formatCommodityChange(listing.change)}
              </span>
              <span>{COMMODITY_COPY.hold(holding)}</span>
            </div>
          </div>
        </div>
        <Sparkline priceHistory={listing.priceHistory} testId={`commodity-sparkline-${listing.id}`} />
      </div>

      {outOfStock ? (
        <p className="commodity-row-empty" data-testid="commodity-empty-hold">{COMMODITY_COPY.empty}</p>
      ) : null}

      <div className="commodity-row-controls">
        <div className="market-stepper" role="group" aria-label={`${meta.name} 數量`}>
          <button
            type="button"
            className="market-stepper-btn"
            disabled={(pendingBuy || pendingSell) && !pendingBuy}
            onClick={() => onQuantityChange(clamp(quantity - 1))}
            aria-label={`減少 ${meta.name}`}
          >
            −
          </button>
          <span className="market-stepper-value" aria-live="polite">{formatQuantity(quantity)}</span>
          <button
            type="button"
            className="market-stepper-btn"
            disabled={quantity >= maxQty || pendingBuy || pendingSell}
            onClick={() => onQuantityChange(clamp(quantity + 1))}
            aria-label={`增加 ${meta.name}`}
          >
            +
          </button>
        </div>

        <div className="commodity-row-previews">
          <span data-testid="commodity-preview-buy">{COMMODITY_COPY.previewBuy(buyTotal)}</span>
          <span data-testid="commodity-preview-sell">{COMMODITY_COPY.previewSell(sellNet)}</span>
        </div>

        <div className="commodity-row-actions">
          <button
            type="button"
            className="market-action-btn commodity-buy-btn"
            disabled={buyDisabled}
            onClick={onBuy}
          >
            {COMMODITY_COPY.buyCta}
          </button>
          <button
            type="button"
            className="market-action-btn commodity-sell-btn"
            disabled={sellDisabled}
            onClick={onSell}
          >
            {COMMODITY_COPY.sellCta}
          </button>
        </div>
      </div>

      {insufficientGold ? <p className="market-row-hint">{COMMODITY_COPY.needGold}</p> : null}
      {outOfStock && quantity > 0 ? <p className="market-row-hint">{COMMODITY_COPY.needStock}</p> : null}
      {feeTooHigh && !outOfStock ? (
        <p className="market-row-hint" data-testid="commodity-fee-high-hint">{COMMODITY_COPY.feeHigh}</p>
      ) : null}
      {overCap ? <p className="market-row-hint">{COMMODITY_COPY.qtyCap}</p> : null}
    </div>
  );
}
