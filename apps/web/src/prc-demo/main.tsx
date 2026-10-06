import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { BuildingCard } from "../components/BuildingCard";
import { DepletionNotice } from "../components/DepletionNotice";
import { Inventory } from "../components/Inventory";
import { isResourceDepleted } from "../depletion";
import {
  BRAND_DISPLAY_NAME,
  FEATURE_SHOW_DEPLETION_EMPTY_STATE,
  OFFLINE_PROGRESS_BANNER,
  OFFLINE_PROGRESS_HUD_CHIP,
  SLICE_FLOW_BANNER,
  SLICE_GOAL_BANNER,
} from "../productCopy";
import "../style.css";
import {
  demoDepletedBuildings,
  demoDepletedInventory,
  demoFieldIdle,
  demoMethodsByRule,
  demoMillIdle,
  growWheatDefault,
  mixFeedDefault,
} from "./fixtures";

function Demo() {
  const methodsByRule = useMemo(() => demoMethodsByRule(), []);
  const resourceDepleted = useMemo(
    () => isResourceDepleted(demoDepletedBuildings, demoDepletedInventory, methodsByRule),
    [methodsByRule],
  );

  return (
    <div className="world" data-screenshot-harness>
      <header className="hud">
        <div className="crest">
          <div className="crest-mark" aria-hidden>
            🌾
          </div>
          <div>
            <h1>{BRAND_DISPLAY_NAME}</h1>
            <small>PR-C · U5 / U6 / U13</small>
          </div>
        </div>
        <div className="clock">
          <span className="chip">{OFFLINE_PROGRESS_HUD_CHIP}</span>
        </div>
      </header>

      <p className="banner banner-goal">{SLICE_GOAL_BANNER}</p>
      <p className="banner">{SLICE_FLOW_BANNER}</p>
      <p className="banner banner-muted">{OFFLINE_PROGRESS_BANNER}</p>
      <DepletionNotice visible={FEATURE_SHOW_DEPLETION_EMPTY_STATE && resourceDepleted} />

      <Inventory inventory={demoDepletedInventory} />

      <section className="settlement" style={{ maxWidth: 920, margin: "1rem 1.2rem" }}>
        <BuildingCard
          building={demoFieldIdle}
          options={[growWheatDefault]}
          inventory={demoDepletedInventory}
          selectedId={growWheatDefault.id}
          selected={growWheatDefault}
          timeScale={60}
          pending={false}
          onSelectMethod={() => undefined}
          onStart={() => undefined}
          onStop={() => undefined}
          onCollect={() => undefined}
        />
        <BuildingCard
          building={demoMillIdle}
          options={[mixFeedDefault]}
          inventory={demoDepletedInventory}
          selectedId={mixFeedDefault.id}
          selected={mixFeedDefault}
          timeScale={60}
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
