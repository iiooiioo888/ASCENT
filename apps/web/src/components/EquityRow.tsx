import { formatQuantity } from "../format";
import type { EquitySnapshot, EquityTicker } from "../equity";
import {
  computeEquityFee,
  equityBuyTotalGold,
  equitySellNetGold,
  formatEquityChange,
  maxAffordableEquityQty,
} from "../equity-math";
import { EQUITY_COPY } from "../equityCopy";
import { EquitySparkline } from "./EquitySparkline";

type Props = {
  ticker: EquityTicker;
  snapshot: EquitySnapshot;
  quantity: number;
  pendingBuy: boolean;
  pendingSell: boolean;
  onQuantityChange: (next: number) => void;
  onBuy: () => void;
  onSell: () => void;
};

export function EquityRow({
  ticker,
  snapshot,
  quantity,
  pendingBuy,
  pendingSell,
  onQuantityChange,
  onBuy,
  onSell,
}: Props) {
  const holding = snapshot.holdings[ticker.id] ?? 0;
  const { feeRate, minFeeGold, maxSharesPerEquity, maxQtyPerOrder } = snapshot;
  const unitPrice = ticker.currentPrice;
  const notional = unitPrice * quantity;
  const fee = computeEquityFee(notional, feeRate, minFeeGold);
  const buyTotal = equityBuyTotalGold(unitPrice, quantity, feeRate, minFeeGold);
  const sellNet = equitySellNetGold(unitPrice, quantity, feeRate, minFeeGold);

  const maxBuyQty = Math.min(
    maxQtyPerOrder,
    Math.max(0, maxSharesPerEquity - holding),
    maxAffordableEquityQty(snapshot.gold, unitPrice, feeRate, minFeeGold, maxQtyPerOrder),
  );
  const maxSellQty = Math.min(maxQtyPerOrder, Math.max(0, Math.floor(holding)));

  const maxQty = Math.max(maxBuyQty, maxSellQty, 1);
  const clamp = (n: number) => Math.max(1, Math.min(maxQty, n));

  const outOfShares = holding <= 0;
  const atCap = holding >= maxSharesPerEquity;
  const insufficientGold = snapshot.gold < buyTotal;
  const feeTooHigh = notional <= fee;
  const sellDisabled = pendingSell || pendingBuy || outOfShares || quantity < 1 || quantity > maxSellQty || feeTooHigh;
  const buyDisabled =
    pendingBuy || pendingSell || atCap || insufficientGold || quantity < 1 || quantity > maxBuyQty;

  const changeClass =
    ticker.change > 0 ? "equity-change-up" : ticker.change < 0 ? "equity-change-down" : "equity-change-flat";

  return (
    <div
      className={[
        "market-row",
        "equity-row",
        pendingBuy || pendingSell ? "pending" : "",
        outOfShares ? "out-of-stock" : "",
        insufficientGold ? "insufficient-gold" : "",
        feeTooHigh ? "fee-too-high" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={`equity-row-${ticker.id}`}
    >
      <div className="market-row-main equity-row-main">
        <div className="equity-row-head">
          <div className="market-row-name">{ticker.name}</div>
          <div className="equity-row-quote">
            <span className="equity-price" data-testid="equity-row-price">
              {EQUITY_COPY.price} 🪙{formatQuantity(unitPrice)}
            </span>
            <span className={`equity-change ${changeClass}`} data-testid="equity-row-change">
              {EQUITY_COPY.change} {formatEquityChange(ticker.change)}
            </span>
          </div>
          <EquitySparkline history={ticker.priceHistory} />
        </div>
        <div className="market-row-meta">
          <span>{EQUITY_COPY.holdings(holding)}</span>
          <span className="equity-preview-buy" data-testid="equity-row-preview-buy">
            {EQUITY_COPY.previewBuy(buyTotal)}
          </span>
          <span className="equity-preview-sell" data-testid="equity-row-preview-sell">
            {EQUITY_COPY.previewSell(sellNet)}
          </span>
        </div>
      </div>

      <div className="market-row-controls equity-row-controls">
        <div className="market-stepper" role="group" aria-label={`${ticker.name} 數量`}>
          <button
            type="button"
            className="market-stepper-btn"
            disabled={pendingBuy || pendingSell || quantity <= 1}
            onClick={() => onQuantityChange(clamp(quantity - 1))}
            aria-label={`減少 ${ticker.name}`}
          >
            −
          </button>
          <span className="market-stepper-value" aria-live="polite">{formatQuantity(quantity)}</span>
          <button
            type="button"
            className="market-stepper-btn"
            disabled={quantity >= maxQty || pendingBuy || pendingSell}
            onClick={() => onQuantityChange(clamp(quantity + 1))}
            aria-label={`增加 ${ticker.name}`}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="market-action-btn equity-sell-btn"
          disabled={sellDisabled}
          onClick={onSell}
        >
          {EQUITY_COPY.sellCta}
        </button>
        <button
          type="button"
          className="market-action-btn equity-buy-btn"
          disabled={buyDisabled}
          onClick={onBuy}
        >
          {EQUITY_COPY.buyCta}
        </button>
      </div>

      {outOfShares ? <p className="market-row-hint">{EQUITY_COPY.needShares}</p> : null}
      {atCap ? <p className="market-row-hint">{EQUITY_COPY.cap}</p> : null}
      {insufficientGold && !atCap ? <p className="market-row-hint">{EQUITY_COPY.needGold}</p> : null}
      {feeTooHigh && !outOfShares ? (
        <p className="market-row-hint" data-testid="equity-row-fee-hint">{EQUITY_COPY.feeHigh}</p>
      ) : null}
    </div>
  );
}
