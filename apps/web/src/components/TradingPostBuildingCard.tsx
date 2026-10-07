import { useEffect, useId, useRef } from "react";
import type { MarketActionErrorView } from "../market-action-error";
import type { CommoditiesSnapshot } from "../commodities";
import type { MarketSnapshot } from "../market";
import type { RetailSnapshot } from "../retail";
import type { RetailShelfSnapshot } from "../retail-shelf";
import { MARKET_COPY } from "../marketCopy";
import { BUILDING_ICON } from "../meta";
import type { Building, OpsCostsSnapshot } from "../types";
import type { LandPurchaseUiState } from "../land-purchase";
import { MarketPanel, type MarketTabFocusRequest } from "./MarketPanel";

type Props = {
  building: Building;
  highlight?: boolean;
  marketOpen: boolean;
  onToggleMarket: () => void;
  market: MarketSnapshot | null;
  panelError: MarketActionErrorView | null;
  pendingKeys: ReadonlySet<string>;
  successToast?: string | null;
  tabFocusRequest?: MarketTabFocusRequest;
  opsCosts?: OpsCostsSnapshot | null;
  commodities?: CommoditiesSnapshot | null;
  commoditiesTabVisible?: boolean;
  retail?: RetailSnapshot | null;
  retailTabVisible?: boolean;
  onRetailTabOpen?: () => void;
  onRetailTabActiveChange?: (active: boolean) => void;
  retailShelf?: RetailShelfSnapshot | null;
  retailShelfTabVisible?: boolean;
  retailShelfPendingEnabled?: boolean;
  retailShelfPendingFollowMarket?: boolean;
  retailShelfPendingAsk?: boolean;
  onRetailShelfTabOpen?: () => void;
  onRetailShelfTabActiveChange?: (active: boolean) => void;
  onRetailShelfToggleEnabled?: (enabled: boolean) => void;
  onRetailShelfToggleFollowMarket?: (followMarket: boolean) => void;
  onRetailShelfSaveAsk?: (ask: number) => void;
  onSell: (itemId: string, quantity: number) => void;
  onBuy: (itemId: string, quantity: number) => void;
  onCommodityBuy?: (commodityId: string, quantity: number) => void;
  onCommoditySell?: (commodityId: string, quantity: number) => void;
  landPurchaseUi?: LandPurchaseUiState | null;
  onPurchaseField?: () => void;
  onRetailAccept?: (offerId: string) => void;
};

/** v1.2：莊外商行建築卡 — 點「交易」展開買賣 panel，無生產動作。 */
export function TradingPostBuildingCard({
  building: b,
  highlight = false,
  marketOpen,
  onToggleMarket,
  market,
  panelError,
  pendingKeys,
  successToast,
  tabFocusRequest,
  opsCosts,
  commodities,
  commoditiesTabVisible,
  retail,
  retailTabVisible,
  onRetailTabOpen,
  onRetailTabActiveChange,
  retailShelf,
  retailShelfTabVisible,
  retailShelfPendingEnabled,
  retailShelfPendingFollowMarket,
  retailShelfPendingAsk,
  onRetailShelfTabOpen,
  onRetailShelfTabActiveChange,
  onRetailShelfToggleEnabled,
  onRetailShelfToggleFollowMarket,
  onRetailShelfSaveAsk,
  onSell,
  onBuy,
  onCommodityBuy,
  onCommoditySell,
  landPurchaseUi,
  onPurchaseField,
  onRetailAccept,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const panelHeadingId = useId();

  useEffect(() => {
    if (!marketOpen) return;
    panelRef.current?.focus();
  }, [marketOpen]);

  const tradeLabel = marketOpen ? MARKET_COPY.closeTradeCta : MARKET_COPY.tradeCta;

  return (
    <article
      id={`building-${b.id}`}
      className={`plot trading-post ${b.status}${marketOpen ? " market-open" : ""}${highlight ? " scroll-highlight" : ""}`}
      data-testid="trading-post-building-card"
    >
      <div className="plot-body">
        <div className="plot-head">
          <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
            <div className="bicon" role="img" aria-label={b.buildingDef.name}>
              {BUILDING_ICON[b.buildingDefId] ?? "🏪"}
            </div>
            <div>
              <h3 className="bname">{b.buildingDef.name}</h3>
              <span className="badge idle">{MARKET_COPY.buildingStatus}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="trading-post-trade-btn"
          aria-expanded={marketOpen}
          aria-controls="market-panel"
          onClick={onToggleMarket}
        >
          {tradeLabel}
        </button>
        {marketOpen ? (
          <MarketPanel
            ref={panelRef}
            id="market-panel"
            headingId={panelHeadingId}
            market={market}
            panelError={panelError}
            pendingKeys={pendingKeys}
            successToast={successToast}
            tabFocusRequest={tabFocusRequest}
            opsCosts={opsCosts}
            commodities={commodities}
            commoditiesTabVisible={commoditiesTabVisible}
            retail={retail}
            retailTabVisible={retailTabVisible}
            onRetailTabOpen={onRetailTabOpen}
            onRetailTabActiveChange={onRetailTabActiveChange}
            retailShelf={retailShelf}
            retailShelfTabVisible={retailShelfTabVisible}
            retailShelfPendingEnabled={retailShelfPendingEnabled}
            retailShelfPendingFollowMarket={retailShelfPendingFollowMarket}
            retailShelfPendingAsk={retailShelfPendingAsk}
            onRetailShelfTabOpen={onRetailShelfTabOpen}
            onRetailShelfTabActiveChange={onRetailShelfTabActiveChange}
            onRetailShelfToggleEnabled={onRetailShelfToggleEnabled}
            onRetailShelfToggleFollowMarket={onRetailShelfToggleFollowMarket}
            onRetailShelfSaveAsk={onRetailShelfSaveAsk}
            onSell={onSell}
            onBuy={onBuy}
            onCommodityBuy={onCommodityBuy}
            onCommoditySell={onCommoditySell}
            landPurchaseUi={landPurchaseUi}
            onPurchaseField={onPurchaseField}
            onRetailAccept={onRetailAccept}
          />
        ) : null}
      </div>
    </article>
  );
}
