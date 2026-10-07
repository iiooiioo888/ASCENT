import { useEffect, useId, useRef } from "react";
import type { MarketActionErrorView } from "../market-action-error";
import type { MarketSnapshot } from "../market";
import { MARKET_COPY } from "../marketCopy";
import { BUILDING_ICON } from "../meta";
import type { Building } from "../types";
import { MarketPanel } from "./MarketPanel";

type Props = {
  building: Building;
  marketOpen: boolean;
  onToggleMarket: () => void;
  market: MarketSnapshot | null;
  panelError: MarketActionErrorView | null;
  pendingKeys: ReadonlySet<string>;
  onSell: (itemId: string, quantity: number) => void;
  onBuy: (itemId: string, quantity: number) => void;
};

/** v1.2：莊外商行建築卡 — 點「交易」展開買賣 panel，無生產動作。 */
export function TradingPostBuildingCard({
  building: b,
  marketOpen,
  onToggleMarket,
  market,
  panelError,
  pendingKeys,
  onSell,
  onBuy,
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
      className={`plot trading-post ${b.status}${marketOpen ? " market-open" : ""}`}
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
            onSell={onSell}
            onBuy={onBuy}
          />
        ) : null}
      </div>
    </article>
  );
}
