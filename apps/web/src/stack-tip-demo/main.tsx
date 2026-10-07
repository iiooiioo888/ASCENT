import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BuildingCard } from "../components/BuildingCard";
import { DepletionNotice } from "../components/DepletionNotice";
import { TradingPostBuildingCard } from "../components/TradingPostBuildingCard";
import { Inventory } from "../components/Inventory";
import { DEMO_SERVER_REAL_TIME } from "../test/demoTime";
import { hudGoldChipLabel } from "../market-feedback";
import {
  BRAND_DISPLAY_NAME,
  BRAND_SUBTITLE,
  GAME_TIME_CHIP_PREFIX,
  OFFLINE_PROGRESS_HUD_CHIP,
  timeScaleHudChip,
} from "../productCopy";
import { fmtGameClockChip } from "../format";
import { buildingScrollAnchorId } from "../depletion-scroll";
import "../style.css";
import {
  demoTradingPostBuilding,
  demoWellBuilding,
  depletedWithGoldInventory,
  drawWaterMethod,
  marketSnapshotGold10,
} from "./fixtures";

const shot = new URLSearchParams(window.location.search).get("shot") ?? "all";

function HudGold10() {
  return (
    <header className="hud" data-shot-id="hud-gold">
      <div className="crest">
        <div className="crest-mark" aria-hidden>🌾</div>
        <div>
          <h1>{BRAND_DISPLAY_NAME}</h1>
          <small>{BRAND_SUBTITLE}</small>
        </div>
      </div>
      <div className="clock">
        <span className="chip chip-muted">{fmtGameClockChip(86400, GAME_TIME_CHIP_PREFIX)}</span>
        <span className="chip">{timeScaleHudChip(60)}</span>
        <span className="chip chip-gold" data-testid="hud-gold-chip">
          {hudGoldChipLabel(10)}
        </span>
        <span className="chip">{OFFLINE_PROGRESS_HUD_CHIP}</span>
      </div>
    </header>
  );
}

function DepletionFullShot() {
  return (
    <div data-shot-id="depletion-ctas" data-screenshot-harness>
      <HudGold10 />
      <DepletionNotice
        visible
        onGoWell={() => undefined}
        onGoSaveSeed={() => undefined}
        onGoMarket={() => undefined}
        marketCtaProminent
      />
      <Inventory inventory={depletedWithGoldInventory} />
    </div>
  );
}

function WellCardShot() {
  return (
    <div data-shot-id="well-card" data-screenshot-harness className="world">
      <p className="banner banner-muted">水井建築卡 · 汲水方式（stack tip cf2f53f）</p>
      <section className="settlement" style={{ maxWidth: 520, margin: "1rem" }}>
        <BuildingCard
          building={demoWellBuilding}
          scrollAnchorId={buildingScrollAnchorId(demoWellBuilding.id)}
          highlight
          options={[drawWaterMethod]}
          inventory={depletedWithGoldInventory}
          selectedId={drawWaterMethod.id}
          selected={drawWaterMethod}
          timeScale={60}
          serverRealTime={DEMO_SERVER_REAL_TIME}
          pending={false}
          onSelectMethod={() => undefined}
          onStart={() => undefined}
          onStop={() => undefined}
          onCollect={() => undefined}
        />
      </section>
    </div>
  );
}

function TradingPostMarketShot() {
  return (
    <div data-shot-id="trading-post-market" data-screenshot-harness className="world">
      <HudGold10 />
      <section className="settlement" style={{ maxWidth: 640, margin: "1rem" }}>
        <TradingPostBuildingCard
          building={demoTradingPostBuilding}
          highlight
          marketOpen
          onToggleMarket={() => undefined}
          market={marketSnapshotGold10}
          panelError={null}
          pendingKeys={new Set()}
          onSell={() => undefined}
          onBuy={() => undefined}
        />
      </section>
    </div>
  );
}

function ScrollHighlightShot() {
  return (
    <div data-shot-id="scroll-highlight" data-screenshot-harness className="world">
      <DepletionNotice
        visible
        onGoWell={() => undefined}
        onGoSaveSeed={() => undefined}
        onGoMarket={() => undefined}
        marketCtaProminent
      />
      <section className="settlement" style={{ maxWidth: 920, margin: "1rem", gap: "1rem" }}>
        <BuildingCard
          building={demoWellBuilding}
          scrollAnchorId={buildingScrollAnchorId(demoWellBuilding.id)}
          options={[drawWaterMethod]}
          inventory={depletedWithGoldInventory}
          selectedId={drawWaterMethod.id}
          selected={drawWaterMethod}
          timeScale={60}
          serverRealTime={DEMO_SERVER_REAL_TIME}
          pending={false}
          onSelectMethod={() => undefined}
          onStart={() => undefined}
          onStop={() => undefined}
          onCollect={() => undefined}
        />
        <TradingPostBuildingCard
          building={demoTradingPostBuilding}
          highlight
          marketOpen={false}
          onToggleMarket={() => undefined}
          market={marketSnapshotGold10}
          panelError={null}
          pendingKeys={new Set()}
          onSell={() => undefined}
          onBuy={() => undefined}
        />
      </section>
    </div>
  );
}

function Demo() {
  const views: Record<string, () => React.ReactElement> = {
    depletion: DepletionFullShot,
    well: WellCardShot,
    market: TradingPostMarketShot,
    scroll: ScrollHighlightShot,
  };

  if (shot !== "all" && views[shot]) {
    return views[shot]();
  }

  return (
    <div className="world" data-screenshot-harness>
      <DepletionFullShot />
      <hr style={{ margin: "2rem 0", borderColor: "#444" }} />
      <WellCardShot />
      <hr style={{ margin: "2rem 0", borderColor: "#444" }} />
      <TradingPostMarketShot />
      <hr style={{ margin: "2rem 0", borderColor: "#444" }} />
      <ScrollHighlightShot />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
