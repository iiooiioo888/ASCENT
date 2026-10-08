import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthGate } from "./AuthGate";
import App from "./App";
import { DOCUMENT_TITLE } from "./productCopy";
import "./style.css";

document.title = DOCUMENT_TITLE;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate>
      <App />
    </AuthGate>
  </StrictMode>,
);
