import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BuildingCard } from "../components/BuildingCard";
import { SiloBuildingCard } from "../components/SiloBuildingCard";
import { DEMO_SERVER_REAL_TIME } from "../test/demoTime";
import { Inventory } from "../components/Inventory";
import { BUILDING_STATE_CHANGED_COPY } from "../format";
import "../style.css";
import {
  demoFieldBuilding,
  demoFieldMethods,
  demoInventory,
  demoMillBuilding,
  demoMillMethods,
  demoSiloBuilding,
} from "./fixtures";

function Harness() {
  const [methodId, setMethodId] = useState("method_grow_wheat_water_saving");
  const selected = demoFieldMethods.find((m) => m.id === methodId);
  const millMethodId = "method_mill_flour_default";
  const millSelected = demoMillMethods.find((m) => m.id === millMethodId);

  return (
    <div className="world" data-screenshot-harness>
      <p className="banner" style={{ marginTop: "1rem" }}>
        PR-A 截圖 harness：U1 卡上錯誤（400 方式／資源不足、409 狀態衝突）、U3 小數與 ×0.5
      </p>
      <Inventory inventory={demoInventory} />
      <section className="settlement" style={{ maxWidth: 920, margin: "1rem 1.2rem" }}>
        <BuildingCard
          building={demoFieldBuilding}
          options={demoFieldMethods}
          inventory={demoInventory}
          selectedId={methodId}
          selected={selected}
          timeScale={60}
          serverRealTime={DEMO_SERVER_REAL_TIME}
          actionError={{ message: "資源不足：水" }}
          pending={false}
          onSelectMethod={setMethodId}
          onStart={() => undefined}
          onStop={() => undefined}
          onCollect={() => undefined}
        />
        <SiloBuildingCard building={demoSiloBuilding} pending={false} />
        <BuildingCard
          building={demoMillBuilding}
          options={demoMillMethods}
          inventory={demoInventory}
          selectedId={millMethodId}
          selected={millSelected}
          timeScale={60}
          serverRealTime={DEMO_SERVER_REAL_TIME}
          actionError={{ message: BUILDING_STATE_CHANGED_COPY }}
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
    <Harness />
  </StrictMode>,
);
