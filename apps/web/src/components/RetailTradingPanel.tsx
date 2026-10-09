import type { RetailSnapshot } from "../retail";
import type { RetailShelfSnapshot } from "../retail-shelf";
import { RETAIL_COPY } from "../retailCopy";
import { RETAIL_SHELF_COPY } from "../retailShelfCopy";
import { RetailOrdersSection } from "./RetailOrdersSection";
import { RetailShelfPanel } from "./RetailShelfPanel";

type Props = {
  retail: RetailSnapshot | null;
  retailVisible: boolean;
  shelf: RetailShelfSnapshot | null;
  shelfVisible: boolean;
  pendingKeys: ReadonlySet<string>;
  retailPendingKeyForOffer: (offerId: string) => string;
  shelfPendingEnabled: boolean;
  shelfPendingFollowMarket: boolean;
  shelfPendingAsk: boolean;
  onRetailAccept?: (offerId: string) => void;
  onShelfToggleEnabled?: (enabled: boolean) => void;
  onShelfToggleFollowMarket?: (followMarket: boolean) => void;
  onShelfSaveAsk?: (ask: number) => void;
};

export function RetailTradingPanel({
  retail,
  retailVisible,
  shelf,
  shelfVisible,
  pendingKeys,
  retailPendingKeyForOffer,
  shelfPendingEnabled,
  shelfPendingFollowMarket,
  shelfPendingAsk,
  onRetailAccept,
  onShelfToggleEnabled,
  onShelfToggleFollowMarket,
  onShelfSaveAsk,
}: Props) {
  const retailLoading = retailVisible && !retail;
  const shelfLoading = shelfVisible && !shelf;

  if (retailLoading && shelfLoading) {
    return <p className="market-loading">{RETAIL_COPY.loading}</p>;
  }

  return (
    <div className="retail-trading-panel" data-testid="retail-trading-panel">
      <p className="commodity-panel-subtitle">{RETAIL_COPY.subtitle}</p>

      {shelfVisible ? (
        <section className="retail-shelf-section" data-testid="retail-shelf-section">
          <h3 className="retail-panel-section-title">{RETAIL_SHELF_COPY.sectionTitle}</h3>
          {shelfLoading ? (
            <p className="market-loading">{RETAIL_SHELF_COPY.loading}</p>
          ) : (
            <RetailShelfPanel
              shelf={shelf}
              pendingEnabled={shelfPendingEnabled}
              pendingFollowMarket={shelfPendingFollowMarket}
              pendingAsk={shelfPendingAsk}
              onToggleEnabled={(enabled) => onShelfToggleEnabled?.(enabled)}
              onToggleFollowMarket={(followMarket) => onShelfToggleFollowMarket?.(followMarket)}
              onSaveAsk={(ask) => onShelfSaveAsk?.(ask)}
            />
          )}
        </section>
      ) : null}

      {retailVisible ? (
        retailLoading ? (
          <p className="market-loading">{RETAIL_COPY.loading}</p>
        ) : retail ? (
          <RetailOrdersSection
            retail={retail}
            pendingKeys={pendingKeys}
            pendingKeyForOffer={retailPendingKeyForOffer}
            onAccept={(id) => onRetailAccept?.(id)}
          />
        ) : null
      ) : null}
    </div>
  );
}
