/** C = 貨幣等非生產 DAG 物品（LOCKED：銅錠結算，不進生產 DAG） */
export type ItemLayer = "T" | "P" | "C";

export type ItemIo = {
  item_id: string;
  qty: number;
  key?: string;
};

export type ItemTypeDef = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  released_in_version: string;
};

export type ItemPropertyValueKind = "number" | "bool" | "string";

export type ItemPropertyDef = {
  id: string;
  code: string;
  name: string;
  value_kind: ItemPropertyValueKind;
  is_active: boolean;
  released_in_version: string;
};

export type ItemDef = {
  id: string;
  code: string;
  type_id: string;
  layer: ItemLayer;
  derived_tier: number;
  is_active: boolean;
  released_in_version: string;
  properties?: Record<string, unknown>;
};

export type ProductionRuleDef = {
  id: string;
  code: string;
  parent_rule_id: string | null;
  inputs: ItemIo[];
  outputs: ItemIo[];
  duration_game_sec: number;
  formulas: Record<string, string>;
  compositions: string[];
  overrides: Record<string, unknown>;
  is_active: boolean;
  released_in_version: string;
  optimizations?: OptimizationSpec[];
};

export type OptimizationSpec = {
  code: string;
  input_factor?: Record<string, number>;
  duration_factor?: number;
  output_factor?: number;
};

export type ProductionMethodDef = {
  id: string;
  code: string;
  rule_id: string;
  optimization: Record<string, unknown>;
  inputs: ItemIo[];
  outputs: ItemIo[];
  duration_game_sec: number;
  is_active: boolean;
  released_in_version: string;
};

export type BuildingDef = {
  id: string;
  code: string;
  name: string;
  system_code: string;
  allowed_rule_ids: string[];
  queue_limit: number;
  is_active: boolean;
  released_in_version: string;
};

export type WorldClock = {
  startRealTimeMs: number;
  startGameTime: number;
};

export type BuildingStatus = "idle" | "running" | "ready";

/** GET state／建築上的 AFK 欄位（AFK-BE-1）。 */
export type BuildingAfkState = {
  autoEnabled: boolean;
  autoPauseReason: string | null;
  autoMethodId: string | null;
};

/** GET state 上的商行貨架摘要（AFK-BE-2 / AFK-D9）。 */
export type RetailShelfStateSummary = {
  enabled: boolean;
  ask: number;
  todayRevenueGold: number;
};

export type BuildingQueueJob = {
  methodId: string;
  durationGameSec: number;
  elapsedGameSec: number;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
};

export type SettleWindowInput = {
  lastSettledAtMs: number;
  nowRealMs: number;
  timeScale: number;
  maxOfflineRealSec: number;
};

export type SettleWindowResult = {
  rawRealDeltaSec: number;
  cappedRealDeltaSec: number;
  gameDeltaSec: number;
  nextLastSettledAtMs: number;
};

export type ValidationError = {
  code: string;
  message: string;
};
