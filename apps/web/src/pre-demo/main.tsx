import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OfflineSummaryNotice } from "../components/OfflineSummaryNotice";
import {
  BRAND_DISPLAY_NAME,
  OFFLINE_PROGRESS_BANNER,
  OFFLINE_PROGRESS_HUD_CHIP,
  SLICE_FLOW_BANNER,
  SLICE_GOAL_BANNER,
} from "../productCopy";
import "../style.css";
import { demoOfflineSummary } from "./fixtures";

function Demo() {
  return (
    <div className="world" data-screenshot-harness>
      <header className="hud">
        <div className="crest">
          <div className="crest-mark" aria-hidden>
            🌾
          </div>
          <div>
            <h1>{BRAND_DISPLAY_NAME}</h1>
            <small>PR-E · U11 離線摘要（方案 A · 待確認）</small>
          </div>
        </div>
        <div className="clock">
          <span className="chip">{OFFLINE_PROGRESS_HUD_CHIP}</span>
        </div>
      </header>

      <p className="banner banner-goal">{SLICE_GOAL_BANNER}</p>
      <p className="banner">{SLICE_FLOW_BANNER}</p>
      <p className="banner banner-muted">{OFFLINE_PROGRESS_BANNER}</p>
      <OfflineSummaryNotice summary={demoOfflineSummary} onDismiss={() => undefined} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
