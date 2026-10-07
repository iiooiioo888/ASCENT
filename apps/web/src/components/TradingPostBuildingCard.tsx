import { BUILDING_ICON } from "../meta";
import { MARKET_COPY } from "../marketCopy";
import type { Building } from "../types";

type Props = {
  building: Building;
  scrollAnchorId: string;
  highlight?: boolean;
  marketOpen: boolean;
  onToggleMarket: () => void;
};

/** v1.2：莊外商行建築卡；點「交易」開買賣 panel。 */
export function TradingPostBuildingCard({
  building: b,
  scrollAnchorId,
  highlight = false,
  marketOpen,
  onToggleMarket,
}: Props) {
  const buildingIconLabel = b.buildingDef.name;

  return (
    <article
      id={scrollAnchorId}
      className={`plot trading-post ${b.status}${highlight ? " scroll-highlight" : ""}`}
      data-testid="trading-post-building-card"
    >
      <fieldset className="plot-body">
        <div className="plot-head">
          <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
            <div className="bicon" role="img" aria-label={buildingIconLabel}>
              {BUILDING_ICON[b.buildingDefId] ?? "🏪"}
            </div>
            <div>
              <h3 className="bname">{b.buildingDef.name}</h3>
              <span className="badge idle">商行</span>
            </div>
          </div>
        </div>
        <p className="jobline">{MARKET_COPY.subtitle}</p>
        <div className="actions">
          <button
            type="button"
            aria-expanded={marketOpen}
            aria-controls="market-panel"
            onClick={onToggleMarket}
          >
            {MARKET_COPY.tradeOpenCta}
          </button>
        </div>
      </fieldset>
    </article>
  );
}
