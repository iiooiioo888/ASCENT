import { ApiError } from "./api";
import { itemLabel } from "./meta";
import { COMMODITY_COPY } from "./commodityCopy";
import type { MarketActionErrorView } from "./market-action-error";

const INSUFFICIENT_PREFIX = "資源不足：";
const NOT_TRADABLE_PREFIX = "不可交易：";

export type MappedCommodityActionError = MarketActionErrorView & {
  shouldRefresh: boolean;
};

type RegistryEntry = { copy: string; shouldRefresh: boolean };

const REGISTRY: Readonly<Record<string, RegistryEntry>> = {
  數量無效: { copy: COMMODITY_COPY.invalidQuantity, shouldRefresh: false },
  金幣不足: { copy: COMMODITY_COPY.needGold, shouldRefresh: false },
  超過單筆上限: { copy: COMMODITY_COPY.qtyCap, shouldRefresh: false },
  手續費過高: { copy: COMMODITY_COPY.feeHigh, shouldRefresh: false },
  進口額度已滿: { copy: COMMODITY_COPY.liquidity, shouldRefresh: false },
  [COMMODITY_COPY.genericError]: {
    copy: COMMODITY_COPY.genericError,
    shouldRefresh: false,
  },
};

function formatInsufficientMaterialsMessage(rawMessage: string): string {
  const rest = rawMessage.slice(INSUFFICIENT_PREFIX.length).trim();
  if (rest === "item_gold") return COMMODITY_COPY.needGold;
  if (rest === "item_oil") return COMMODITY_COPY.needStock;
  return `${INSUFFICIENT_PREFIX}${itemLabel(rest)}`;
}

function formatNotTradableMessage(rawMessage: string): string {
  const rest = rawMessage.slice(NOT_TRADABLE_PREFIX.length).trim();
  if (!rest) return COMMODITY_COPY.genericError;
  return `${NOT_TRADABLE_PREFIX}${itemLabel(rest)}`;
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
    return { copy: COMMODITY_COPY.genericError, shouldRefresh: true };
  }
  return null;
}

export function mapCommodityActionError(raw: unknown): MappedCommodityActionError {
  if (!(raw instanceof ApiError)) {
    const debug = raw instanceof Error ? raw.message : String(raw);
    return {
      message: COMMODITY_COPY.genericError,
      shouldRefresh: false,
      hint: import.meta.env.DEV ? debug : undefined,
    };
  }

  const hit = lookupRegistry(raw);
  if (hit) {
    return { message: hit.copy, shouldRefresh: hit.shouldRefresh };
  }

  return {
    message: COMMODITY_COPY.genericError,
    shouldRefresh: false,
    hint: import.meta.env.DEV ? `${raw.code ?? ""} ${raw.message}`.trim() : undefined,
  };
}
