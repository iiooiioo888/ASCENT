import { api, ApiError } from "./api";
import type { RetailOffer } from "@ascent/shared";

export type RetailOpsHint = {
  busy: number;
  wage: number;
  haul: number;
  fee: number;
};

export type RetailSnapshot = {
  offers: RetailOffer[];
  breadQty: number;
  slotCount: number;
  opsHint?: RetailOpsHint;
};

export type RetailAcceptResult = {
  offerId: string;
  skuId: string;
  quantity: number;
  bidGold: number;
  goldDelta: number;
  feeGold: number;
  haulGold: number;
  replacementOffer?: RetailOffer;
};

export function retailPreviewNet(bidGold: number, qty: number): number {
  return bidGold * qty;
}

export async function fetchRetail(): Promise<RetailSnapshot> {
  return api<RetailSnapshot>("/api/v1/market/retail");
}

/** API 不存在時回 null（隱藏 tab）。 */
export async function fetchRetailOptional(): Promise<RetailSnapshot | null> {
  try {
    return await fetchRetail();
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
      return null;
    }
    throw e;
  }
}

export async function postRetailAccept(offerId: string): Promise<RetailAcceptResult> {
  return api<RetailAcceptResult>("/api/v1/market/retail/accept", {
    method: "POST",
    body: JSON.stringify({ offerId }),
  });
}
