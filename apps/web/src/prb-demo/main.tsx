import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BuildingCard } from "../components/BuildingCard";
import { StopConfirmDialog } from "../components/StopConfirmDialog";
import "../style.css";
import {
  demoFieldIdle,
  demoInventoryShortWater,
  demoMillRunning,
  growWheatDefault,
  mixFeedDefault,
} from "./fixtures";

function Demo() {
  return (
    <div className="world" style={{ padding: "1rem", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ color: "var(--gold)", fontSize: "1.1rem", letterSpacing: "0.12em" }}>PR-B demo（fixture）</h1>
      <div className="settlement" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <section aria-label="U2 shortage">
          <h2 style={{ fontSize: "0.85rem", color: "#d4c4a0", margin: "0 0 0.5rem" }}>U2 · 庫存不足</h2>
          <BuildingCard
            building={demoFieldIdle}
            options={[growWheatDefault]}
            inventory={demoInventoryShortWater}
            selectedId={growWheatDefault.id}
            selected={growWheatDefault}
            timeScale={60}
            pending={false}
            onSelectMethod={() => undefined}
            onStart={() => undefined}
            onStop={() => undefined}
            onCollect={() => undefined}
          />
        </section>
        <section aria-label="U4 stop confirm" style={{ position: "relative", minHeight: 320 }}>
          <h2 style={{ fontSize: "0.85rem", color: "#d4c4a0", margin: "0 0 0.5rem" }}>U4 · 停止確認</h2>
          <BuildingCard
            building={demoMillRunning}
            options={[mixFeedDefault]}
            inventory={demoInventoryShortWater}
            selectedId={mixFeedDefault.id}
            selected={mixFeedDefault}
            timeScale={60}
            pending={false}
            onSelectMethod={() => undefined}
            onStart={() => undefined}
            onStop={() => undefined}
            onCollect={() => undefined}
          />
          <StopConfirmDialog
            open
            buildingName={demoMillRunning.buildingDef.name}
            method={mixFeedDefault}
            onCancel={() => undefined}
            onConfirm={() => undefined}
          />
        </section>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
