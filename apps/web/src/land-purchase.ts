import {
  canPurchaseField,
  countPlayerFields,
  FIELD_CAP,
  LAND_ERROR_COPY,
  PLAYER_BUILDING_SLOT_CAP,
} from "@ascent/shared";
import { api } from "./api";
import { LAND_COPY } from "./landCopy";
import type { Building, GameState } from "./types";

export const LAND_PURCHASE_PENDING_KEY = "land:purchase-field";

export type LandPurchaseStats = {
  fieldCount: number;
  fieldCap: number;
  buildingCount: number;
  buildingSlotCap: number;
};

export type LandPurchaseUiState = {
  stats: LandPurchaseStats;
  priceGold: number | null;
  canBuy: boolean;
  blockReason: string | null;
};

export type PurchaseFieldResponse = {
  building: Building;
  gold: number;
  pricePaid: number;
};

export function landPurchaseStatsFromState(state: GameState): LandPurchaseStats {
  return {
    fieldCount: state.fieldCount ?? countPlayerFields(state.buildings),
    fieldCap: state.fieldCap ?? FIELD_CAP,
    buildingCount: state.buildingCount ?? state.buildings.length,
    buildingSlotCap: state.buildingSlotCap ?? PLAYER_BUILDING_SLOT_CAP,
  };
}

const REASON_COPY: Record<keyof typeof LAND_ERROR_COPY, string> = {
  INSUFFICIENT_GOLD: LAND_COPY.needGold,
  FIELD_AT_CAP: LAND_COPY.fieldAtCap,
  BUILDING_SLOTS_FULL: LAND_COPY.slotsFull,
  FIELD_USE_PURCHASE_API: LAND_COPY.fieldAtCap,
  DUPLICATE_BUILDING_DEF: LAND_COPY.fieldAtCap,
};

export function evaluateLandPurchaseUi(stats: LandPurchaseStats, gold: number): LandPurchaseUiState {
  const gate = canPurchaseField({
    fieldCount: stats.fieldCount,
    buildingCount: stats.buildingCount,
  });
  if (!gate.ok) {
    return {
      stats,
      priceGold: null,
      canBuy: false,
      blockReason: REASON_COPY[gate.reason],
    };
  }
  if (gold < gate.priceGold) {
    return {
      stats,
      priceGold: gate.priceGold,
      canBuy: false,
      blockReason: LAND_COPY.needGold,
    };
  }
  return {
    stats,
    priceGold: gate.priceGold,
    canBuy: true,
    blockReason: null,
  };
}

export async function postPurchaseField(): Promise<PurchaseFieldResponse> {
  return api<PurchaseFieldResponse>("/api/v1/buildings/purchase-field", {
    method: "POST",
    body: JSON.stringify({}),
  });
}
