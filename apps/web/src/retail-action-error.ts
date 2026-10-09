import { ApiError } from "./api";
import { itemLabel } from "./meta";
import { RETAIL_COPY } from "./retailCopy";
import type { MarketActionErrorView } from "./market-action-error";
import { SETTLEMENT_COPY } from "./settlementCopy";

const INSUFFICIENT_PREFIX = "資源不足：";

export type MappedRetailActionError = MarketActionErrorView & {
  shouldRefresh: boolean;
};

type RegistryEntry = { copy: string; shouldRefresh: boolean };

const REGISTRY: Readonly<Record<string, RegistryEntry>> = {
  客單已失效: { copy: RETAIL_COPY.expired, shouldRefresh: true },
  金幣不足: { copy: RETAIL_COPY.needGold, shouldRefresh: false },
  [SETTLEMENT_COPY.insufficient]: { copy: RETAIL_COPY.needGold, shouldRefresh: false },
  [RETAIL_COPY.genericError]: {
    copy: RETAIL_COPY.genericError,
    shouldRefresh: false,
  },
};

function formatInsufficientMaterialsMessage(rawMessage: string): string {
  const rest = rawMessage.slice(INSUFFICIENT_PREFIX.length).trim();
  if (rest === "item_bread") return RETAIL_COPY.needStock;
  return `${INSUFFICIENT_PREFIX}${itemLabel(rest)}`;
}

function lookupRegistry(error: ApiError): RegistryEntry | null {
  if (error.code && REGISTRY[error.code]) {
    return REGISTRY[error.code];
  }
  if (REGISTRY[error.message]) {
    return REGISTRY[error.message];
  }
  if (error.message.startsWith(INSUFFICIENT_PREFIX)) {
    return { copy: formatInsufficientMaterialsMessage(error.message), shouldRefresh: false };
  }
  if (error.status === 409) {
    return { copy: RETAIL_COPY.genericError, shouldRefresh: true };
  }
  return null;
}

export function mapRetailActionError(raw: unknown): MappedRetailActionError {
  if (!(raw instanceof ApiError)) {
    const debug = raw instanceof Error ? raw.message : String(raw);
    return {
      message: RETAIL_COPY.genericError,
      shouldRefresh: false,
      hint: import.meta.env.DEV ? debug : undefined,
    };
  }

  const hit = lookupRegistry(raw);
  if (hit) {
    return { message: hit.copy, shouldRefresh: hit.shouldRefresh };
  }

  return {
    message: RETAIL_COPY.genericError,
    shouldRefresh: false,
    hint: import.meta.env.DEV ? `${raw.code ?? ""} ${raw.message}`.trim() : undefined,
  };
}
