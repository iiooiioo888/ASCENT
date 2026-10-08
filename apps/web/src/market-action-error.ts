import { ApiError } from "./api";
import { itemLabel } from "./meta";
import { OPS_DEPTH_COPY } from "./ops-depth-copy";
import { EQUITY_COPY } from "./equityCopy";
import { LAND_COPY } from "./landCopy";
import { SETTLEMENT_COPY } from "./settlementCopy";
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
  [SETTLEMENT_COPY.insufficient]: { copy: MARKET_COPY.needGold, shouldRefresh: false },
  農田已達上限: { copy: LAND_COPY.fieldAtCap, shouldRefresh: false },
  建築欄位已滿: { copy: LAND_COPY.slotsFull, shouldRefresh: false },
  持倉不足: { copy: EQUITY_COPY.needShares, shouldRefresh: false },
  已達持倉上限: { copy: EQUITY_COPY.cap, shouldRefresh: false },
  超過單筆上限: { copy: EQUITY_COPY.qtyCap, shouldRefresh: false },
  手續費過高: { copy: EQUITY_COPY.feeHigh, shouldRefresh: false },
  運費過高: { copy: OPS_DEPTH_COPY.sellTransportTooHigh, shouldRefresh: false },
  [MARKET_COPY.settlementConflict]: {
    copy: MARKET_COPY.settlementConflict,
    shouldRefresh: false,
  },
};

function formatInsufficientMaterialsMessage(rawMessage: string): string {
  const rest = rawMessage.slice(INSUFFICIENT_PREFIX.length).trim();
  if (rest === "item_gold" || rest === "item_copper_ingot") return MARKET_COPY.needGold;
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
