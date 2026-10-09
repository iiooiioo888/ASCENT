import type { RetailOffer } from "@ascent/shared";
import { itemLabel } from "../meta";
import { retailPreviewNet } from "../retail";
import { formatRetailOfferRemaining, retailSlotLabel } from "../retail-offer-display";
import { RETAIL_COPY } from "../retailCopy";

type Props = {
  offer: RetailOffer;
  slotIndex?: number;
  breadQty: number;
  nowMs: number;
  expired?: boolean;
  pending: boolean;
  onAccept: () => void;
};

export function RetailOfferCard({
  offer,
  slotIndex,
  breadQty,
  nowMs,
  expired = false,
  pending,
  onAccept,
}: Props) {
  const net = retailPreviewNet(offer.bidGold, offer.qty);
  const insufficient = breadQty < offer.qty;
  const disabled = pending || insufficient || expired;
  const buyer = offer.buyerLabel ?? "到訪客人";
  const ttl = formatRetailOfferRemaining(offer.expiresAt, nowMs);

  return (
    <article
      className={[
        "commodity-row",
        "retail-offer-card",
        pending ? "pending" : "",
        insufficient ? "out-of-stock" : "",
        expired ? "expired" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={`retail-offer-${offer.offerId}`}
    >
      <div className="commodity-row-head retail-offer-head">
        <div className="commodity-row-title">
          <span className="commodity-row-icon" aria-hidden>🍞</span>
          <div>
            <div className="commodity-row-name" data-testid="retail-offer-buyer">{buyer}</div>
            <div className="commodity-row-stats">
              {slotIndex != null ? (
                <span data-testid="retail-offer-slot">{retailSlotLabel(slotIndex)}</span>
              ) : null}
              <span data-testid="retail-offer-sku">{itemLabel(offer.skuId)}</span>
              <span data-testid="retail-offer-qty">{RETAIL_COPY.offerQty(offer.qty)}</span>
              <span data-testid="retail-offer-bid">{RETAIL_COPY.bid(offer.bidGold)}</span>
              <span data-testid="retail-offer-ttl">{ttl}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="commodity-row-controls retail-offer-controls">
        <p className="commodity-row-previews" data-testid="retail-offer-preview">
          {RETAIL_COPY.preview(net)}
        </p>
        <div className="commodity-row-actions">
          <button
            type="button"
            className="market-action-btn commodity-buy-btn"
            disabled={disabled}
            onClick={onAccept}
            data-testid="retail-offer-accept"
          >
            {RETAIL_COPY.accept}
          </button>
        </div>
      </div>

      {insufficient ? (
        <p className="market-row-hint" data-testid="retail-offer-need-stock">{RETAIL_COPY.needStock}</p>
      ) : null}
    </article>
  );
}
