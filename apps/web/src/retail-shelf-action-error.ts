import { ApiError } from "./api";
import type { MarketActionErrorView } from "./market-action-error";
import { RETAIL_SHELF_COPY } from "./retailShelfCopy";

export type MappedRetailShelfActionError = MarketActionErrorView & {
  shouldRefresh: boolean;
};

type RegistryEntry = { copy: string; shouldRefresh: boolean };

const REGISTRY: Readonly<Record<string, RegistryEntry>> = {
  "enabled 須為布林": { copy: RETAIL_SHELF_COPY.genericError, shouldRefresh: false },
  "ask 須為 ≥1 的整數": { copy: RETAIL_SHELF_COPY.askInvalid, shouldRefresh: false },
  "請提供 enabled 或 ask": { copy: RETAIL_SHELF_COPY.genericError, shouldRefresh: false },
  [RETAIL_SHELF_COPY.genericError]: {
    copy: RETAIL_SHELF_COPY.genericError,
    shouldRefresh: false,
  },
};

function lookupRegistry(error: ApiError): RegistryEntry | null {
  if (error.code && REGISTRY[error.code]) {
    return REGISTRY[error.code];
  }
  if (REGISTRY[error.message]) {
    return REGISTRY[error.message];
  }
  if (error.status === 409) {
    return { copy: RETAIL_SHELF_COPY.genericError, shouldRefresh: true };
  }
  return null;
}

export function mapRetailShelfActionError(raw: unknown): MappedRetailShelfActionError {
  if (!(raw instanceof ApiError)) {
    const debug = raw instanceof Error ? raw.message : String(raw);
    return {
      message: RETAIL_SHELF_COPY.genericError,
      shouldRefresh: false,
      hint: import.meta.env.DEV ? debug : undefined,
    };
  }

  const hit = lookupRegistry(raw);
  if (hit) {
    return { message: hit.copy, shouldRefresh: hit.shouldRefresh };
  }

  return {
    message: RETAIL_SHELF_COPY.genericError,
    shouldRefresh: false,
    hint: import.meta.env.DEV ? `${raw.code ?? ""} ${raw.message}`.trim() : undefined,
  };
}
