import { api, ApiError } from "./api";
import { RETAIL_SKU_ID, type RetailShelfPublicState } from "@ascent/shared";

export type RetailShelfSnapshot = RetailShelfPublicState;

export type RetailShelfStateSlice = {
  enabled: boolean;
  followMarket?: boolean;
  ask: number;
  todayRevenueGold: number;
};

export async function fetchRetailShelf(): Promise<RetailShelfSnapshot> {
  return api<RetailShelfSnapshot>("/api/v1/market/retail/shelf");
}

/** API 不存在時回 null（隱藏 tab）。 */
export async function fetchRetailShelfOptional(): Promise<RetailShelfSnapshot | null> {
  try {
    return await fetchRetailShelf();
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
      return null;
    }
    throw e;
  }
}

export async function patchRetailShelf(body: {
  enabled?: boolean;
  followMarket?: boolean;
  ask?: number;
}): Promise<RetailShelfSnapshot> {
  return api<RetailShelfSnapshot>("/api/v1/market/retail/shelf", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function mergeRetailShelfFromState(
  current: RetailShelfSnapshot | null,
  slice: RetailShelfStateSlice | undefined,
): RetailShelfSnapshot | null {
  if (!slice) return current;
  const skuId = current?.skuId ?? RETAIL_SKU_ID;
  return {
    enabled: slice.enabled,
    followMarket: slice.followMarket ?? current?.followMarket ?? true,
    ask: slice.ask,
    todayRevenueGold: slice.todayRevenueGold,
    skuId,
  };
}
