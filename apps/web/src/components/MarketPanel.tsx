import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import type { MarketActionErrorView } from "../market-action-error";
import type { MarketSnapshot } from "../market";
import { MARKET_COPY, marketBalanceLabel } from "../marketCopy";
import { sellTransportPreview } from "../ops-depth";
import type { OpsCostsSnapshot } from "../types";
import type { CommoditiesSnapshot } from "../commodities";
import { enabledCommodityListings } from "../commodities";
import { COMMODITY_COPY } from "../commodityCopy";
import { LAND_COPY } from "../landCopy";
import { LAND_PURCHASE_PENDING_KEY, type LandPurchaseUiState } from "../land-purchase";
import { CommodityRow } from "./CommodityRow";
import { ExpandFieldPanel } from "./ExpandFieldPanel";
import { MarketRow } from "./MarketRow";
import { RetailTradingPanel } from "./RetailTradingPanel";
import type { RetailSnapshot } from "../retail";
import { RETAIL_COPY } from "../retailCopy";
import type { RetailShelfSnapshot } from "../retail-shelf";

type Tab = "sell" | "buy" | "commodities" | "expand" | "retail";

export type MarketTabFocusRequest = { tab: Tab; seq: number };

type Props = {
  id?: string;
  headingId?: string;
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

function pendingKey(side: "sell" | "buy", itemId: string) {
  return `market:${side}:${itemId}`;
}

export function commodityPendingKey(side: "buy" | "sell", commodityId: string) {
  return `commodity:${side}:${commodityId}`;
}

export function retailPendingKey(offerId: string) {
  return `retail:accept:${offerId}`;
}

export const RETAIL_SHELF_PENDING_ENABLED_KEY = "retail-shelf:enabled";
export const RETAIL_SHELF_PENDING_FOLLOW_MARKET_KEY = "retail-shelf:follow-market";
export const RETAIL_SHELF_PENDING_ASK_KEY = "retail-shelf:ask";

export const MarketPanel = forwardRef(function MarketPanel(
  {
    id = "market-panel",
    headingId,
    market,
    panelError,
    pendingKeys,
    successToast,
    tabFocusRequest,
    opsCosts,
    commodities,
    commoditiesTabVisible = false,
    retail,
    retailTabVisible = false,
    onRetailTabOpen,
    onRetailTabActiveChange,
    retailShelf,
    retailShelfTabVisible = false,
    retailShelfPendingEnabled = false,
    retailShelfPendingFollowMarket = false,
    retailShelfPendingAsk = false,
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
  }: Props,
  ref: Ref<HTMLElement>,
) {
  const [tab, setTab] = useState<Tab>("sell");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [commodityQuantities, setCommodityQuantities] = useState<Record<string, number>>({});
  const panelScrollRef = useRef<HTMLElement | null>(null);
  const savedScrollTopRef = useRef(0);

  useEffect(() => {
    if (!tabFocusRequest) return;
    setTab(tabFocusRequest.tab);
  }, [tabFocusRequest]);

  const retailPanelVisible = retailTabVisible || retailShelfTabVisible;

  useEffect(() => {
    const retailTabOpen = tab === "retail";
    onRetailTabActiveChange?.(retailTabOpen);
    onRetailShelfTabActiveChange?.(retailTabOpen && retailShelfTabVisible);
    if (retailTabOpen) {
      onRetailTabOpen?.();
      if (retailShelfTabVisible) onRetailShelfTabOpen?.();
    }
  }, [
    tab,
    retailShelfTabVisible,
    onRetailTabOpen,
    onRetailTabActiveChange,
    onRetailShelfTabOpen,
    onRetailShelfTabActiveChange,
  ]);

  const sellIds = useMemo(() => {
    if (!market?.prices?.sell) return [];
    return Object.keys(market.prices.sell).sort();
  }, [market]);

  const buyIds = useMemo(() => {
    if (!market?.prices?.buy) return [];
    return Object.keys(market.prices.buy).sort();
  }, [market]);

  const commodityListings = useMemo(
    () => (commodities ? enabledCommodityListings(commodities) : []),
    [commodities],
  );

  const qtyFor = useCallback(
    (side: "sell" | "buy", itemId: string, holding: number, gold: number, unitPrice: number) => {
      const key = `${side}:${itemId}`;
      const stored = quantities[key];
      if (stored !== undefined) return stored;
      if (side === "sell") return holding > 0 ? 1 : 1;
      const maxAfford = unitPrice > 0 ? Math.floor(gold / unitPrice) : 0;
      return maxAfford > 0 ? 1 : 1;
    },
    [quantities],
  );

  const setQty = useCallback((side: "sell" | "buy", itemId: string, next: number) => {
    const key = `${side}:${itemId}`;
    setQuantities((prev) => ({ ...prev, [key]: next }));
  }, []);

  const mergePanelRef = useCallback(
    (node: HTMLElement | null) => {
      panelScrollRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  useEffect(() => {
    const el = panelScrollRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      savedScrollTopRef.current = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useLayoutEffect(() => {
    const el = panelScrollRef.current;
    if (el && savedScrollTopRef.current > 0) {
      el.scrollTop = savedScrollTopRef.current;
    }
  }, [market, commodities, tab]);

  useEffect(() => {
    if (!market) return;
    setQuantities((prev) => {
      const next = { ...prev };
      for (const itemId of sellIds) {
        const key = `sell:${itemId}`;
        const hold = market.holdings[itemId] ?? 0;
        const max = Math.max(0, Math.floor(hold));
        if (next[key] !== undefined && max > 0 && next[key] > max) {
          next[key] = max;
        }
      }
      return next;
    });
  }, [market, sellIds]);

  const hasSellableStock = useMemo(() => {
    if (!market) return false;
    return sellIds.some((id) => (market.holdings[id] ?? 0) > 0);
  }, [market, sellIds]);

  const gold = market?.gold ?? 0;
  const expandPending = pendingKeys.has(LAND_PURCHASE_PENDING_KEY);

  const titleId = headingId ?? "market-panel-title";

  return (
    <section
      ref={mergePanelRef}
      id={id}
      className="market-panel pack"
      tabIndex={-1}
      aria-labelledby={titleId}
    >
      <header className="market-panel-head">
        <div>
          <h2 id={titleId}>{MARKET_COPY.title}</h2>
          <p className="market-panel-subtitle">{MARKET_COPY.subtitle}</p>
        </div>
        <p className="market-balance" data-testid="market-gold-balance">
          {marketBalanceLabel(gold)}
        </p>
      </header>

      <p className="market-hint banner-muted">
        {tab === "commodities"
          ? COMMODITY_COPY.hint
          : tab === "expand"
            ? LAND_COPY.subtitle
            : tab === "retail"
              ? RETAIL_COPY.hint
              : MARKET_COPY.hint}
      </p>

      <p
        className={`market-trade-toast-slot${successToast ? " has-toast" : ""}`}
        role="status"
        aria-live="polite"
        data-testid="market-success-toast"
      >
        {successToast ?? ""}
      </p>

      {panelError ? (
        <p className="market-panel-error" role="alert" title={panelError.hint}>
          {panelError.message}
        </p>
      ) : null}

      <div className="market-tabs" role="tablist" aria-label="商行交易">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "sell"}
          className={tab === "sell" ? "active" : ""}
          onClick={() => setTab("sell")}
        >
          {MARKET_COPY.sellTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "buy"}
          className={tab === "buy" ? "active" : ""}
          onClick={() => setTab("buy")}
        >
          {MARKET_COPY.buyTab}
        </button>
        {commoditiesTabVisible ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === "commodities"}
            className={tab === "commodities" ? "active" : ""}
            onClick={() => setTab("commodities")}
            data-testid="market-tab-commodities"
          >
            {COMMODITY_COPY.tab}
          </button>
        ) : null}
        {landPurchaseUi ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === "expand"}
            className={tab === "expand" ? "active" : ""}
            onClick={() => setTab("expand")}
            data-testid="market-tab-expand"
          >
            {LAND_COPY.tab}
          </button>
        ) : null}
        {retailPanelVisible ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === "retail"}
            className={tab === "retail" ? "active" : ""}
            onClick={() => setTab("retail")}
            data-testid="market-tab-retail"
          >
            {RETAIL_COPY.tab}
          </button>
        ) : null}
      </div>

      {tab === "expand" && landPurchaseUi ? (
        <ExpandFieldPanel
          ui={landPurchaseUi}
          pending={expandPending}
          onPurchase={() => onPurchaseField?.()}
        />
      ) : tab === "retail" ? (
        <div className="market-table retail-table" role="tabpanel" data-testid="market-retail-panel">
          <RetailTradingPanel
            retail={retail ?? null}
            retailVisible={retailTabVisible}
            shelf={retailShelf ?? null}
            shelfVisible={retailShelfTabVisible}
            pendingKeys={pendingKeys}
            retailPendingKeyForOffer={retailPendingKey}
            shelfPendingEnabled={retailShelfPendingEnabled}
            shelfPendingFollowMarket={retailShelfPendingFollowMarket}
            shelfPendingAsk={retailShelfPendingAsk}
            onRetailAccept={onRetailAccept}
            onShelfToggleEnabled={onRetailShelfToggleEnabled}
            onShelfToggleFollowMarket={onRetailShelfToggleFollowMarket}
            onShelfSaveAsk={onRetailShelfSaveAsk}
          />
        </div>
      ) : tab === "commodities" ? (
        <div className="market-table commodity-table" role="tabpanel" data-testid="market-commodities-panel">
          {!commodities ? (
            <p className="market-loading">{COMMODITY_COPY.loading}</p>
          ) : (
            <>
              <p className="commodity-panel-subtitle">{COMMODITY_COPY.subtitle}</p>
              {commodityListings.map((listing) => {
                const qty = commodityQuantities[listing.id] ?? 1;
                const pendingBuy = pendingKeys.has(commodityPendingKey("buy", listing.id));
                const pendingSell = pendingKeys.has(commodityPendingKey("sell", listing.id));
                return (
                  <CommodityRow
                    key={listing.id}
                    listing={listing}
                    snapshot={commodities}
                    quantity={qty}
                    pendingBuy={pendingBuy}
                    pendingSell={pendingSell}
                    onQuantityChange={(n) =>
                      setCommodityQuantities((prev) => ({ ...prev, [listing.id]: n }))
                    }
                    onBuy={() => onCommodityBuy?.(listing.id, qty)}
                    onSell={() => onCommoditySell?.(listing.id, qty)}
                  />
                );
              })}
              <p className="commodity-disclaimer banner-muted">{COMMODITY_COPY.disclaimer}</p>
            </>
          )}
        </div>
      ) : !market ? (
        <p className="market-loading">載入商行價目…</p>
      ) : tab === "sell" ? (
        <div className="market-table" role="tabpanel">
          {!hasSellableStock ? (
            <p className="market-empty" data-testid="market-empty-sell">{MARKET_COPY.emptySell}</p>
          ) : null}
          {sellIds.map((itemId) => {
            const unitPrice = market.prices.sell[itemId] ?? 0;
            const holding = market.holdings[itemId] ?? 0;
            const quantity = qtyFor("sell", itemId, holding, gold, unitPrice);
            const pending = pendingKeys.has(pendingKey("sell", itemId));
            const sellPreview = sellTransportPreview(unitPrice, quantity, itemId, opsCosts);
            return (
              <MarketRow
                key={itemId}
                itemId={itemId}
                side="sell"
                unitPrice={unitPrice}
                holding={holding}
                quantity={quantity}
                goldBalance={gold}
                pending={pending}
                sellPreview={sellPreview}
                onQuantityChange={(n) => setQty("sell", itemId, n)}
                onAction={() => onSell(itemId, quantity)}
              />
            );
          })}
        </div>
      ) : (
        <div className="market-table" role="tabpanel">
          {buyIds.map((itemId) => {
            const unitPrice = market.prices.buy[itemId] ?? 0;
            const holding = market.holdings[itemId] ?? 0;
            const quantity = qtyFor("buy", itemId, holding, gold, unitPrice);
            const pending = pendingKeys.has(pendingKey("buy", itemId));
            return (
              <MarketRow
                key={itemId}
                itemId={itemId}
                side="buy"
                unitPrice={unitPrice}
                holding={holding}
                quantity={quantity}
                goldBalance={gold}
                pending={pending}
                onQuantityChange={(n) => setQty("buy", itemId, n)}
                onAction={() => onBuy(itemId, quantity)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
});

export { pendingKey as marketPendingKey };
