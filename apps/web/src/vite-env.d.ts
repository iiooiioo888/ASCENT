/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_SILO_CARD_MODE?: "simplified" | "legacy";
  readonly VITE_FEATURE_SHOW_SILO_PLACEMENT?: string;
  readonly VITE_FEATURE_SHOW_DEPLETION_EMPTY_STATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
