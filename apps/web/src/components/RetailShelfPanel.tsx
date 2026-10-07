import { useEffect, useState } from "react";
import { formatQuantity } from "../format";
import { ITEM_META, itemLabel } from "../meta";
import type { RetailShelfSnapshot } from "../retail-shelf";
import { RETAIL_SHELF_COPY } from "../retailShelfCopy";

type Props = {
  shelf: RetailShelfSnapshot | null;
  pendingEnabled: boolean;
  pendingFollowMarket: boolean;
  pendingAsk: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleFollowMarket: (followMarket: boolean) => void;
  onSaveAsk: (ask: number) => void;
};

export function RetailShelfPanel({
  shelf,
  pendingEnabled,
  pendingFollowMarket,
  pendingAsk,
  onToggleEnabled,
  onToggleFollowMarket,
  onSaveAsk,
}: Props) {
  const [draftAsk, setDraftAsk] = useState(1);

  useEffect(() => {
    if (shelf) setDraftAsk(shelf.ask);
  }, [shelf?.ask]);

  if (!shelf) {
    return <p className="market-loading">{RETAIL_SHELF_COPY.loading}</p>;
  }

  const skuId = shelf.skuId ?? "item_bread";
  const meta = ITEM_META[skuId] ?? { name: itemLabel(skuId), icon: "🍞" };
  const followMarket = shelf.followMarket;
  const askDirty = draftAsk !== shelf.ask;
  const askValid = Number.isInteger(draftAsk) && draftAsk >= 1;
  const askControlsLocked = followMarket || pendingAsk;
  const askDisabled = askControlsLocked || !askValid || !askDirty;
  const rowPending = pendingEnabled || pendingFollowMarket || pendingAsk;

  const clampAsk = (n: number) => Math.max(1, Math.floor(n));

  return (
    <div className="retail-shelf-panel" data-testid="retail-shelf-panel">
      <p className="commodity-panel-subtitle">{RETAIL_SHELF_COPY.subtitle}</p>
      <div
        className={`market-row retail-shelf-row${rowPending ? " pending" : ""}`}
        data-testid="retail-shelf-card"
      >
        <div className="market-row-main">
          <span className="market-row-icon" aria-hidden>{meta.icon}</span>
          <div className="market-row-text">
            <div className="market-row-name" data-testid="retail-shelf-sku">{meta.name}</div>
            <p
              className="market-row-meta retail-shelf-revenue"
              data-testid="retail-shelf-today-revenue"
            >
              {RETAIL_SHELF_COPY.todayRevenue(shelf.todayRevenueGold)}
            </p>
          </div>
        </div>

        <div className="retail-shelf-controls">
          <div className="retail-shelf-toggle-row">
            <span className="retail-shelf-toggle-label">{RETAIL_SHELF_COPY.enabledLabel}</span>
            <button
              type="button"
              role="switch"
              aria-checked={shelf.enabled}
              aria-label={RETAIL_SHELF_COPY.enabledLabel}
              className={`retail-shelf-toggle${shelf.enabled ? " on" : ""}`}
              disabled={pendingEnabled}
              data-testid="retail-shelf-enabled"
              onClick={() => onToggleEnabled(!shelf.enabled)}
            >
              <span className="retail-shelf-toggle-knob" aria-hidden />
              <span className="retail-shelf-toggle-text">
                {shelf.enabled ? RETAIL_SHELF_COPY.enabledOn : RETAIL_SHELF_COPY.enabledOff}
              </span>
            </button>
          </div>

          <div className="retail-shelf-toggle-row">
            <span className="retail-shelf-toggle-label">{RETAIL_SHELF_COPY.followMarketLabel}</span>
            <button
              type="button"
              role="switch"
              aria-checked={followMarket}
              aria-label={RETAIL_SHELF_COPY.followMarketLabel}
              className={`retail-shelf-toggle${followMarket ? " on" : ""}`}
              disabled={pendingFollowMarket}
              data-testid="retail-shelf-follow-market"
              onClick={() => onToggleFollowMarket(!followMarket)}
            >
              <span className="retail-shelf-toggle-knob" aria-hidden />
              <span className="retail-shelf-toggle-text">
                {followMarket ? RETAIL_SHELF_COPY.followMarketOn : RETAIL_SHELF_COPY.followMarketOff}
              </span>
            </button>
          </div>

          <div
            className={`retail-shelf-ask-row${followMarket ? " retail-shelf-ask-follow-market" : ""}`}
          >
            <span className="retail-shelf-ask-label">{RETAIL_SHELF_COPY.askLabel}</span>
            {followMarket ? (
              <span className="retail-shelf-ask-auto-badge" data-testid="retail-shelf-ask-auto">
                {RETAIL_SHELF_COPY.askAutoBadge}
              </span>
            ) : null}
            <div className="market-stepper" role="group" aria-label={RETAIL_SHELF_COPY.askLabel}>
              <button
                type="button"
                className="market-stepper-btn"
                disabled={askControlsLocked}
                onClick={() => setDraftAsk(clampAsk(draftAsk - 1))}
                aria-label="降低標價"
              >
                −
              </button>
              <span
                className="market-stepper-value"
                data-testid="retail-shelf-ask-value"
                aria-live="polite"
              >
                {formatQuantity(draftAsk)}
              </span>
              <button
                type="button"
                className="market-stepper-btn"
                disabled={askControlsLocked}
                onClick={() => setDraftAsk(clampAsk(draftAsk + 1))}
                aria-label="提高標價"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="market-action-btn retail-shelf-ask-cta"
              disabled={askDisabled}
              data-testid="retail-shelf-ask-apply"
              onClick={() => onSaveAsk(draftAsk)}
            >
              {pendingAsk ? RETAIL_SHELF_COPY.pending : RETAIL_SHELF_COPY.askCta}
            </button>
            {followMarket ? (
              <p className="retail-shelf-follow-hint banner-muted" data-testid="retail-shelf-follow-hint">
                {RETAIL_SHELF_COPY.followMarketHint}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
