export type InvRow = {
  itemId: string;
  quantity: string;
  item: { code: string; layer: string; derivedTier: number };
};

export type Method = {
  id: string;
  code: string;
  ruleId: string;
  durationGameSec: number;
  inputs: { item_id: string; qty: number }[];
  outputs: { item_id: string; qty: number }[];
};

export type Building = {
  id: string;
  status: string;
  buildingDefId: string;
  buildingDef: { name: string; allowedRuleIds: string[] };
  methodId: string | null;
  queue: { elapsedGameSec: number; durationGameSec: number }[];
  bufferedOutputs: Record<string, number>;
  /** 休地結束遊戲秒（僅休地中由 API 回傳） */
  fallowUntil?: number;
  /** AFK-BE-1：自動循環開關（GET /state） */
  autoEnabled?: boolean;
  /** AFK-BE-1：自動暫停原因（中文，API 原文） */
  autoPauseReason?: string | null;
  /** P4-S1：自動開工使用的配方；null 表示使用建築預設 */
  autoMethodId?: string | null;
  /** 確定性離線磨損後的耐久（0–100）。 */
  durability?: number;
};

export type NpcOrderView = {
  id: string;
  ruleId: string;
  status: string;
  requiredItems: { item_id: string; quantity: number }[];
  rewards: { kind: string; item_id: string; quantity: number }[];
  createdGameSec: number;
  expiresGameSec: number;
};

export type WorkforceSnapshot = {
  hired: number;
  busy: number;
  free: number;
  maxHired: number;
};

export type OpsCostsSnapshot = {
  hireCostGold: number;
  wageByBuilding: Record<string, number>;
  haulByBuilding: Record<string, number>;
  sellTransport?: Record<string, number>;
  laborCostPerStart: number;
};

export type EnvironmentState = {
  weather: "fair" | "rain" | "drought";
  yieldMult: number;
  nextChangeAt?: number;
};

export type GameState = {
  time: { displayGameTime: number; timeScale: number; serverRealTime: string };
  inventory: InvRow[];
  buildings: Building[];
  methods: Method[];
  buildingDefs: {
    id: string;
    name: string;
    code: string;
    systemCode?: string;
    system_code?: string;
  }[];
  workforce?: WorkforceSnapshot;
  opsCosts?: OpsCostsSnapshot;
  environment?: EnvironmentState;
  /** LAND-BE-1：當前田數／上限（GET /state）。 */
  fieldCount?: number;
  fieldCap?: number;
  buildingCount?: number;
  buildingSlotCap?: number;
  unlockedIndustries?: string[];
  npcOrders?: NpcOrderView[];
  /** AFK-BE-2：商行麵包貨架摘要（GET /state）。 */
  retailShelf?: {
    enabled: boolean;
    followMarket?: boolean;
    ask: number;
    todayRevenueGold: number;
  };
};
