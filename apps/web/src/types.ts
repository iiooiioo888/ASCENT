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
};

export type GameState = {
  time: { displayGameTime: number; timeScale: number; serverRealTime: string };
  inventory: InvRow[];
  buildings: Building[];
  methods: Method[];
  buildingDefs: { id: string; name: string; code: string }[];
};
