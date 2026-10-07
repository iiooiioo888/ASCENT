import { BUILDING_ICON } from "../meta";
import { FIELD_BUILDING_DEF_ID } from "../resource-loop-copy";
import {
  LAND_COPY,
  landFieldStatusLabel,
  landSlotStatusLabel,
} from "../landCopy";
import type { LandPurchaseUiState } from "../land-purchase";

type Props = {
  ui: LandPurchaseUiState;
  pending: boolean;
  onPurchase: () => void;
};

/** 莊外商行「擴田」卡（LAND-FE-1）。 */
export function ExpandFieldPanel({ ui, pending, onPurchase }: Props) {
  const { stats, priceGold, canBuy, blockReason } = ui;
  const disabled = pending || !canBuy;
  const icon = BUILDING_ICON[FIELD_BUILDING_DEF_ID] ?? "🌾";

  return (
    <div className="land-purchase-card" role="tabpanel" data-testid="market-expand-field-panel">
      <p className="land-purchase-subtitle">{LAND_COPY.subtitle}</p>
      <div
        className={`market-row land-purchase-row${!canBuy && blockReason ? " land-purchase-blocked" : ""}${pending ? " pending" : ""}`}
      >
        <div className="market-row-main">
          <span className="market-row-icon" aria-hidden>{icon}</span>
          <div>
            <p className="market-row-name">{LAND_COPY.title}</p>
            <p className="market-row-meta">
              <span data-testid="land-field-status">
                {LAND_COPY.fieldStatus} {landFieldStatusLabel(stats.fieldCount, stats.fieldCap)}
              </span>
              <span className="land-purchase-meta-sep" aria-hidden>·</span>
              <span data-testid="land-slot-status">
                {LAND_COPY.slotStatus} {landSlotStatusLabel(stats.slottedBuildingCount, stats.buildingSlotCap)}
              </span>
            </p>
            {priceGold != null ? (
              <p className="market-row-meta" data-testid="land-purchase-price">
                {LAND_COPY.priceLabel} 🪙{priceGold}
              </p>
            ) : null}
            {blockReason ? (
              <p className="market-row-hint shortage" data-testid="land-purchase-block-reason">
                {blockReason}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className="market-action-btn"
          disabled={disabled}
          data-testid="land-purchase-cta"
          onClick={onPurchase}
        >
          {pending ? LAND_COPY.pending : LAND_COPY.cta}
        </button>
      </div>
    </div>
  );
}
