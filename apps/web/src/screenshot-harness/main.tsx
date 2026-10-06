import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BuildingCard } from "../components/BuildingCard";
import { Inventory } from "../components/Inventory";
import "../style.css";
import { demoFieldBuilding, demoFieldMethods, demoInventory } from "./fixtures";

function Harness() {
  const [methodId, setMethodId] = useState("method_grow_wheat_water_saving");
  const selected = demoFieldMethods.find((m) => m.id === methodId);

  return (
    <div className="world" data-screenshot-harness>
      <p className="banner" style={{ marginTop: "1rem" }}>
        PR-A 截圖用固定資料（非連線狀態）：田卡動作錯誤、背包小數、省水消耗 ×0.5
      </p>
      <Inventory inventory={demoInventory} />
      <section className="settlement" style={{ maxWidth: 440, margin: "1rem 1.2rem" }}>
        <BuildingCard
          building={demoFieldBuilding}
          options={demoFieldMethods}
          selectedId={methodId}
          selected={selected}
          timeScale={60}
          actionError="資源不足：水"
          pending={false}
          onSelectMethod={setMethodId}
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
