import { isRetailOfferExpired } from "@ascent/shared";
import type { RetailSnapshot } from "../retail";
import { RETAIL_COPY } from "../retailCopy";
import { retailSlotSummary } from "../retail-offer-display";
import { useProgressTick } from "../hooks/useProgressTick";
import { RetailOfferCard } from "./RetailOfferCard";

type Props = {
  retail: RetailSnapshot;
  pendingKeys: ReadonlySet<string>;
  pendingKeyForOffer: (offerId: string) => string;
  onAccept: (offerId: string) => void;
};

export function RetailOrdersSection({
  retail,
  pendingKeys,
  pendingKeyForOffer,
  onAccept,
}: Props) {
  const nowMs = useProgressTick(true);
  const { offers, slotCount, breadQty } = retail;
  const emptySlots = Math.max(0, slotCount - offers.length);

  return (
    <section className="retail-orders-section" data-testid="retail-orders-section">
      <h3 className="retail-panel-section-title">{RETAIL_COPY.ordersSectionTitle}</h3>
      <p className="banner-muted retail-slot-summary" data-testid="retail-slot-summary">
        {retailSlotSummary(offers.length, slotCount)}
      </p>
      <p className="banner-muted retail-stock-banner" data-testid="retail-bread-stock">
        {RETAIL_COPY.stockBanner(breadQty)}
      </p>
      {breadQty <= 0 ? (
        <p className="market-empty" data-testid="retail-empty-stock">{RETAIL_COPY.emptyStock}</p>
      ) : null}
      {offers.length === 0 && emptySlots === 0 ? (
        <p className="market-empty" data-testid="retail-empty-offers">{RETAIL_COPY.emptyOffers}</p>
      ) : null}
      {offers.map((offer, index) => (
        <RetailOfferCard
          key={offer.offerId}
          offer={offer}
          slotIndex={index + 1}
          breadQty={breadQty}
          nowMs={nowMs}
          expired={isRetailOfferExpired(offer.expiresAt, nowMs)}
          pending={pendingKeys.has(pendingKeyForOffer(offer.offerId))}
          onAccept={() => onAccept(offer.offerId)}
        />
      ))}
      {Array.from({ length: emptySlots }, (_, i) => (
        <EmptyRetailSlot key={`empty-${i}`} slotIndex={offers.length + i + 1} />
      ))}
      <p className="commodity-disclaimer banner-muted">{RETAIL_COPY.haulNote}</p>
    </section>
  );
}

function EmptyRetailSlot({ slotIndex }: { slotIndex: number }) {
  return (
    <div
      className="retail-slot-empty commodity-row"
      data-testid="retail-slot-empty"
      data-slot-index={slotIndex}
    >
      <p className="retail-slot-empty-label">{RETAIL_COPY.emptySlot(slotIndex)}</p>
    </div>
  );
}
