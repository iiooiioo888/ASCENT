import { ApiError } from "./api";
import { itemLabel } from "./meta";
import { OPS_DEPTH_COPY } from "./ops-depth-copy";

/** Stable API `code` values (preferred lookup key). */
export const BUILDING_ACTION_ERROR_CODES = {
  BUILDING_STATE_CONFLICT: "building_state_conflict",
  BUILDING_SETTLEMENT_CONFLICT: "building_settlement_conflict",
  BUILDING_NOT_READY_TO_COLLECT: "building_not_ready_to_collect",
  BUILDING_BUSY_OR_READY: "building_busy_or_ready",
  BUILDING_METHOD_NOT_ALLOWED: "building_method_not_allowed",
  INSUFFICIENT_MATERIALS: "insufficient_materials",
  BUILDING_NOT_FOUND: "building_not_found",
  UNKNOWN_PRODUCTION_METHOD: "unknown_production_method",
  UNKNOWN_BUILDING_DEF: "unknown_building_def",
} as const;

/** Traditional Chinese copy shown on building cards. */
export const BUILDING_ACTION_ERROR_COPY = {
  STATE_CHANGED: "建築狀態已變更，請重新整理",
  SETTLEMENT_CONFLICT: "建築結算衝突，請重試",
  GENERIC: "操作失敗，請重試",
  METHOD_NOT_ALLOWED: "此建築不能使用該方式",
  BUILDING_NOT_FOUND: "找不到該建築",
  UNKNOWN_METHOD: "未知的生產方式",
  UNKNOWN_BUILDING_DEF: "未知的建築類型",
} as const;

type RegistryEntry = { copy: string; shouldRefresh: boolean };

/**
 * Lookup table: `error.code ?? error.message` → UX copy + whether to soft-refresh state.
 *
 * | Key (code or message) | Card copy | Refresh? |
 * |-----------------------|-----------|----------|
 * | building_state_conflict | 建築狀態已變更，請重新整理 | yes |
 * | 建築狀態已變更，請重新整理 | 建築狀態已變更，請重新整理 | yes |
 * | building_not_ready_to_collect / 尚無可收取產出 | 建築狀態已變更，請重新整理 | yes |
 * | building_busy_or_ready / 建築忙碌或待收取 | 建築狀態已變更，請重新整理 | yes |
 * | building_settlement_conflict / 建築結算衝突，請重試 | 建築結算衝突，請重試 | no |
 * | building_method_not_allowed / 此建築不能使用該方式 | 此建築不能使用該方式 | no |
 * | insufficient_materials / 資源不足：* | 資源不足：{物品名} | no |
 * | building_not_found / 建築不存在 | 找不到該建築 | no |
 * | unknown_production_method / 未知生產方式 | 未知的生產方式 | no |
 * | unknown_building_def / 未知建築 | 未知的建築類型 | no |
 * | (unknown) | 操作失敗，請重試 | no |
 */
const REGISTRY: Readonly<Record<string, RegistryEntry>> = {
  [BUILDING_ACTION_ERROR_CODES.BUILDING_STATE_CONFLICT]: {
    copy: BUILDING_ACTION_ERROR_COPY.STATE_CHANGED,
    shouldRefresh: true,
  },
  [BUILDING_ACTION_ERROR_COPY.STATE_CHANGED]: {
    copy: BUILDING_ACTION_ERROR_COPY.STATE_CHANGED,
    shouldRefresh: true,
  },
  [BUILDING_ACTION_ERROR_CODES.BUILDING_NOT_READY_TO_COLLECT]: {
    copy: BUILDING_ACTION_ERROR_COPY.STATE_CHANGED,
    shouldRefresh: true,
  },
  尚無可收取產出: {
    copy: BUILDING_ACTION_ERROR_COPY.STATE_CHANGED,
    shouldRefresh: true,
  },
  [BUILDING_ACTION_ERROR_CODES.BUILDING_BUSY_OR_READY]: {
    copy: BUILDING_ACTION_ERROR_COPY.STATE_CHANGED,
    shouldRefresh: true,
  },
  建築忙碌或待收取: {
    copy: BUILDING_ACTION_ERROR_COPY.STATE_CHANGED,
    shouldRefresh: true,
  },
  [BUILDING_ACTION_ERROR_CODES.BUILDING_SETTLEMENT_CONFLICT]: {
    copy: BUILDING_ACTION_ERROR_COPY.SETTLEMENT_CONFLICT,
    shouldRefresh: false,
  },
  [BUILDING_ACTION_ERROR_COPY.SETTLEMENT_CONFLICT]: {
    copy: BUILDING_ACTION_ERROR_COPY.SETTLEMENT_CONFLICT,
    shouldRefresh: false,
  },
  [BUILDING_ACTION_ERROR_CODES.BUILDING_METHOD_NOT_ALLOWED]: {
    copy: BUILDING_ACTION_ERROR_COPY.METHOD_NOT_ALLOWED,
    shouldRefresh: false,
  },
  此建築不能使用該方式: {
    copy: BUILDING_ACTION_ERROR_COPY.METHOD_NOT_ALLOWED,
    shouldRefresh: false,
  },
  [BUILDING_ACTION_ERROR_CODES.BUILDING_NOT_FOUND]: {
    copy: BUILDING_ACTION_ERROR_COPY.BUILDING_NOT_FOUND,
    shouldRefresh: false,
  },
  建築不存在: {
    copy: BUILDING_ACTION_ERROR_COPY.BUILDING_NOT_FOUND,
    shouldRefresh: false,
  },
  [BUILDING_ACTION_ERROR_CODES.UNKNOWN_PRODUCTION_METHOD]: {
    copy: BUILDING_ACTION_ERROR_COPY.UNKNOWN_METHOD,
    shouldRefresh: false,
  },
  未知生產方式: {
    copy: BUILDING_ACTION_ERROR_COPY.UNKNOWN_METHOD,
    shouldRefresh: false,
  },
  [BUILDING_ACTION_ERROR_CODES.UNKNOWN_BUILDING_DEF]: {
    copy: BUILDING_ACTION_ERROR_COPY.UNKNOWN_BUILDING_DEF,
    shouldRefresh: false,
  },
  未知建築: {
    copy: BUILDING_ACTION_ERROR_COPY.UNKNOWN_BUILDING_DEF,
    shouldRefresh: false,
  },
  人手不足: {
    copy: OPS_DEPTH_COPY.needHands,
    shouldRefresh: false,
  },
  金幣不足: {
    copy: OPS_DEPTH_COPY.needGold,
    shouldRefresh: false,
  },
  銅錠不足: {
    copy: OPS_DEPTH_COPY.needGold,
    shouldRefresh: false,
  },
  已達僱工上限: {
    copy: OPS_DEPTH_COPY.workforceCap,
    shouldRefresh: false,
  },
  土地休耕中: {
    copy: "土地休耕中",
    shouldRefresh: false,
  },
  "倉庫已隱藏，無法放置": {
    copy: "倉庫已隱藏，無法放置",
    shouldRefresh: false,
  },
};

const INSUFFICIENT_PREFIX = "資源不足：";

export type BuildingActionErrorView = {
  message: string;
  /** Raw backend detail for `title` in dev builds only. */
  hint?: string;
};

export type MappedBuildingActionError = BuildingActionErrorView & {
  shouldRefresh: boolean;
};

function formatInsufficientMaterialsMessage(rawMessage: string): string {
  const rest = rawMessage.slice(INSUFFICIENT_PREFIX.length);
  const itemId = rest.trim();
  if (itemId === "item_gold" || itemId === "item_copper_ingot") return OPS_DEPTH_COPY.needGold;
  return `${INSUFFICIENT_PREFIX}${itemLabel(itemId)}`;
}

function lookupRegistry(error: ApiError): RegistryEntry | null {
  if (error.code && REGISTRY[error.code]) {
    return REGISTRY[error.code];
  }
  if (REGISTRY[error.message]) {
    return REGISTRY[error.message];
  }
  if (error.code === BUILDING_ACTION_ERROR_CODES.INSUFFICIENT_MATERIALS) {
    return {
      copy: formatInsufficientMaterialsMessage(error.message.startsWith(INSUFFICIENT_PREFIX) ? error.message : `${INSUFFICIENT_PREFIX}${error.message}`),
      shouldRefresh: false,
    };
  }
  if (error.message.startsWith(INSUFFICIENT_PREFIX)) {
    return { copy: formatInsufficientMaterialsMessage(error.message), shouldRefresh: false };
  }
  if (error.status === 409) {
    return REGISTRY[BUILDING_ACTION_ERROR_CODES.BUILDING_STATE_CONFLICT] ?? null;
  }
  return null;
}

export function mapBuildingActionError(raw: unknown): MappedBuildingActionError {
  if (!(raw instanceof ApiError)) {
    const debug = raw instanceof Error ? raw.message : String(raw);
    return {
      message: BUILDING_ACTION_ERROR_COPY.GENERIC,
      shouldRefresh: false,
      hint: import.meta.env.DEV ? debug : undefined,
    };
  }

  const hit = lookupRegistry(raw);
  if (hit) {
    return { message: hit.copy, shouldRefresh: hit.shouldRefresh };
  }

  return {
    message: BUILDING_ACTION_ERROR_COPY.GENERIC,
    shouldRefresh: false,
    hint: import.meta.env.DEV ? `${raw.code ?? ""} ${raw.message}`.trim() : undefined,
  };
}

export function isStaleBuildingActionError(raw: unknown): boolean {
  return mapBuildingActionError(raw).shouldRefresh;
}

export function formatActionError(raw: unknown): string {
  return mapBuildingActionError(raw).message;
}

export function toBuildingActionErrorView(raw: unknown): BuildingActionErrorView {
  const mapped = mapBuildingActionError(raw);
  return { message: mapped.message, hint: mapped.hint };
}
