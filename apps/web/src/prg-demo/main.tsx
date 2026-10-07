import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IndustryChain } from "../components/IndustryChain";
import { SiloBuildingCard } from "../components/SiloBuildingCard";
import { BuildingCard } from "../components/BuildingCard";
import { Inventory } from "../components/Inventory";
import { fmtGameClockChip } from "../format";
import { sortInventoryRows } from "../inventorySort";
import {
  BRAND_DISPLAY_NAME,
  BRAND_SUBTITLE,
  GAME_TIME_CHIP_PREFIX,
  OFFLINE_PROGRESS_HUD_CHIP,
  timeScaleHudChip,
} from "../productCopy";
import "../style.css";
import { DEMO_SERVER_REAL_TIME } from "../test/demoTime";
import { growMethod, prgBuildings, prgInventory } from "./fixtures";

function Demo() {
  const field = prgBuildings[0];
  const sorted = sortInventoryRows(prgInventory);

  return (
    <div className="world" data-screenshot-harness>
      <header className="hud">
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
          <span className="chip">{OFFLINE_PROGRESS_HUD_CHIP}</span>
        </div>
      </header>
      <p className="banner banner-muted" style={{ marginTop: "0.5rem" }}>
        PR-G harness：U12 倉精簡卡 · P3 產業鏈狀態 · 背包 DAG 排序 · 時間 chip · 進度插值
      </p>
      <Inventory inventory={sorted} />
      <IndustryChain buildings={prgBuildings} />
      <section className="settlement">
        <BuildingCard
          building={field}
          options={[growMethod]}
          inventory={prgInventory}
          selectedId={growMethod.id}
          selected={growMethod}
          timeScale={60}
          serverRealTime={DEMO_SERVER_REAL_TIME}
          pending={false}
          onSelectMethod={() => undefined}
          onStart={() => undefined}
          onStop={() => undefined}
          onCollect={() => undefined}
        />
        <SiloBuildingCard building={prgBuildings[2]} pending={false} />
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
