/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_SHOW_DEPLETION_EMPTY_STATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
