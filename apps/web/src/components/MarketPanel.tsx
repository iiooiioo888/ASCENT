import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import type { Ref } from "react";
import type { MarketActionErrorView } from "../market-action-error";
import type { MarketSnapshot } from "../market";
import { MARKET_COPY, marketBalanceLabel } from "../marketCopy";
import { MarketRow } from "./MarketRow";

type Tab = "sell" | "buy";

export type MarketTabFocusRequest = { tab: Tab; seq: number };

type Props = {
  id?: string;
  headingId?: string;
  market: MarketSnapshot | null;
  panelError: MarketActionErrorView | null;
  pendingKeys: ReadonlySet<string>;
  successToast?: string | null;
  tabFocusRequest?: MarketTabFocusRequest;
  onSell: (itemId: string, quantity: number) => void;
  onBuy: (itemId: string, quantity: number) => void;
};

function pendingKey(side: Tab, itemId: string) {
  return `market:${side}:${itemId}`;
}

export const MarketPanel = forwardRef(function MarketPanel(
  {
    id = "market-panel",
    headingId,
    market,
    panelError,
    pendingKeys,
    successToast,
    tabFocusRequest,
    onSell,
    onBuy,
  }: Props,
  ref: Ref<HTMLElement>,
) {
  const [tab, setTab] = useState<Tab>("sell");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!tabFocusRequest) return;
    setTab(tabFocusRequest.tab);
  }, [tabFocusRequest]);

  const sellIds = useMemo(() => {
    if (!market?.prices?.sell) return [];
    return Object.keys(market.prices.sell).sort();
  }, [market]);

  const buyIds = useMemo(() => {
    if (!market?.prices?.buy) return [];
    return Object.keys(market.prices.buy).sort();
  }, [market]);

  const qtyFor = useCallback(
    (side: Tab, itemId: string, holding: number, gold: number, unitPrice: number) => {
      const key = `${side}:${itemId}`;
      const stored = quantities[key];
      if (stored !== undefined) return stored;
      if (side === "sell") return holding > 0 ? 1 : 1;
      const maxAfford = unitPrice > 0 ? Math.floor(gold / unitPrice) : 0;
      return maxAfford > 0 ? 1 : 1;
    },
    [quantities],
  );

  const setQty = useCallback((side: Tab, itemId: string, next: number) => {
    const key = `${side}:${itemId}`;
    setQuantities((prev) => ({ ...prev, [key]: next }));
  }, []);

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

  const titleId = headingId ?? "market-panel-title";

  return (
    <section
      ref={ref}
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

      <p className="market-hint banner-muted">{MARKET_COPY.hint}</p>

      {successToast ? (
        <p className="market-trade-toast" role="status" aria-live="polite" data-testid="market-success-toast">
          {successToast}
        </p>
      ) : null}

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
      </div>

      {!market ? (
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
