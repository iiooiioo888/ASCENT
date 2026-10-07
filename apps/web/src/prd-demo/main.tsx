import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BuildingCard } from "../components/BuildingCard";
import { ConnectionStatusBar } from "../components/ConnectionStatusBar";
import { Inventory } from "../components/Inventory";
import { formatCollectSuccess } from "../successFeedback";
import "../style.css";
import { demoFieldReady, demoInventoryAfterCollect, growWheatDefault } from "./fixtures";

const collectSuccess = formatCollectSuccess(demoFieldReady.bufferedOutputs) ?? "";
const highlight = new Set(["item_wheat", "item_straw"]);

function Demo() {
  return (
    <div className="world" data-screenshot-harness>
      <ConnectionStatusBar visible />
      <p className="banner" style={{ marginTop: "0.5rem" }}>
        PR-D 截圖 harness：U9 收取成功浮字與背包高亮 · U10 連線中斷狀態列
      </p>
      <Inventory inventory={demoInventoryAfterCollect} highlightItemIds={highlight} />
      <section className="settlement" style={{ maxWidth: 920, margin: "1rem 1.2rem" }}>
        <BuildingCard
          building={demoFieldReady}
          options={[growWheatDefault]}
          inventory={demoInventoryAfterCollect}
          selectedId={growWheatDefault.id}
          selected={growWheatDefault}
          timeScale={60}
          actionSuccess={collectSuccess}
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
