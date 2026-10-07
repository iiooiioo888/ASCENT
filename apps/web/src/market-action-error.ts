import { ApiError } from "./api";
import { itemLabel } from "./meta";
import { MARKET_COPY } from "./marketCopy";

const INSUFFICIENT_PREFIX = "資源不足：";
const NOT_TRADABLE_PREFIX = "不可交易：";

export type MarketActionErrorView = {
  message: string;
  hint?: string;
};

export type MappedMarketActionError = MarketActionErrorView & {
  shouldRefresh: boolean;
};

type RegistryEntry = { copy: string; shouldRefresh: boolean };

const REGISTRY: Readonly<Record<string, RegistryEntry>> = {
  數量無效: { copy: MARKET_COPY.invalidQuantity, shouldRefresh: false },
  金幣不足: { copy: MARKET_COPY.needGold, shouldRefresh: false },
  [MARKET_COPY.settlementConflict]: {
    copy: MARKET_COPY.settlementConflict,
    shouldRefresh: false,
  },
};

function formatInsufficientMaterialsMessage(rawMessage: string): string {
  const rest = rawMessage.slice(INSUFFICIENT_PREFIX.length).trim();
  if (rest === "item_gold") return MARKET_COPY.needGold;
  return `${INSUFFICIENT_PREFIX}${itemLabel(rest)}`;
}

function formatNotTradableMessage(rawMessage: string): string {
  const rest = rawMessage.slice(NOT_TRADABLE_PREFIX.length).trim();
  if (!rest) return MARKET_COPY.notTradable;
  return `${MARKET_COPY.notTradable}（${itemLabel(rest)}）`;
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
  if (error.message.startsWith(NOT_TRADABLE_PREFIX)) {
    return { copy: formatNotTradableMessage(error.message), shouldRefresh: false };
  }
  if (error.status === 409) {
    return REGISTRY[MARKET_COPY.settlementConflict] ?? { copy: MARKET_COPY.genericError, shouldRefresh: true };
  }
  return null;
}

export function mapMarketActionError(raw: unknown): MappedMarketActionError {
  if (!(raw instanceof ApiError)) {
    const debug = raw instanceof Error ? raw.message : String(raw);
    return {
      message: MARKET_COPY.genericError,
      shouldRefresh: false,
      hint: import.meta.env.DEV ? debug : undefined,
    };
  }

  const hit = lookupRegistry(raw);
  if (hit) {
    return { message: hit.copy, shouldRefresh: hit.shouldRefresh };
  }

  return {
    message: MARKET_COPY.genericError,
    shouldRefresh: false,
    hint: import.meta.env.DEV ? `${raw.code ?? ""} ${raw.message}`.trim() : undefined,
  };
}
