import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BuildingCard } from "../components/BuildingCard";
import { Inventory } from "../components/Inventory";
import { StopConfirmDialog } from "../components/StopConfirmDialog";
import "../style.css";
import { demoFieldIdle, demoInventoryShortWater, growWheatDefault } from "../prb-demo/fixtures";

function Demo() {
  return (
    <div className="world" data-screenshot-harness>
      <p className="banner banner-muted" style={{ marginTop: "0.75rem" }}>
        PR-F harness：U14 窄屏 44px 觸控目標 · U15 方式 label、進度條、停止對話框
      </p>
      <Inventory inventory={demoInventoryShortWater} />
      <section className="settlement">
        <BuildingCard
          building={demoFieldIdle}
          options={[growWheatDefault]}
          inventory={demoInventoryShortWater}
          selectedId={growWheatDefault.id}
          selected={growWheatDefault}
          timeScale={60}
          actionError={{ message: "資源不足：水" }}
          pending={false}
          onSelectMethod={() => undefined}
          onStart={() => undefined}
          onStop={() => undefined}
          onCollect={() => undefined}
        />
      </section>
      <StopConfirmDialog
        open
        buildingName="田"
        method={growWheatDefault}
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
