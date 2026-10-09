/** LOCKED MVP：產業選項卡解鎖。農業永遠開；其餘看生涯收取量。 */

export const MILESTONE_INDUSTRIES = [
  "agriculture",
  "mining",
  "timber",
  "chemical",
  "industry",
  "energy",
] as const;

export type MilestoneIndustryId = (typeof MILESTONE_INDUSTRIES)[number];

export type MilestoneUnlock = {
  industry: Exclude<MilestoneIndustryId, "agriculture">;
  itemId: string;
  qty: number;
  label: string;
};

export const MILESTONE_UNLOCKS: readonly MilestoneUnlock[] = [
  { industry: "mining", itemId: "item_bread", qty: 4, label: "收取 4 個麵包" },
  { industry: "timber", itemId: "item_iron_ingot", qty: 2, label: "收取 2 個鐵錠" },
  { industry: "chemical", itemId: "item_plank", qty: 4, label: "收取 4 塊木板" },
  { industry: "industry", itemId: "item_alkali", qty: 1, label: "收取 1 份鹼" },
  { industry: "energy", itemId: "item_machine", qty: 1, label: "收取 1 台機械" },
];

export const DEFAULT_UNLOCKED_INDUSTRIES: MilestoneIndustryId[] = ["agriculture"];

export type PlayerProgress = {
  lifetimeCollected: Record<string, number>;
  unlockedIndustries: MilestoneIndustryId[];
};

export function emptyPlayerProgress(): PlayerProgress {
  return {
    lifetimeCollected: {},
    unlockedIndustries: [...DEFAULT_UNLOCKED_INDUSTRIES],
  };
}

export function playerProgressFromDb(raw: unknown): PlayerProgress {
  const base = emptyPlayerProgress();
  if (!raw || typeof raw !== "object") return base;
  const obj = raw as {
    lifetimeCollected?: Record<string, unknown>;
    unlockedIndustries?: unknown;
  };
  if (obj.lifetimeCollected && typeof obj.lifetimeCollected === "object") {
    for (const [id, qty] of Object.entries(obj.lifetimeCollected)) {
      if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) {
        base.lifetimeCollected[id] = qty;
      }
    }
  }
  base.unlockedIndustries = evaluateUnlockedIndustries(base.lifetimeCollected);
  if (Array.isArray(obj.unlockedIndustries)) {
    const extra = obj.unlockedIndustries.filter(
      (id): id is MilestoneIndustryId =>
        typeof id === "string" && (MILESTONE_INDUSTRIES as readonly string[]).includes(id),
    );
    for (const id of extra) {
      if (!base.unlockedIndustries.includes(id)) base.unlockedIndustries.push(id);
    }
  }
  return base;
}

export function addLifetimeCollected(
  progress: PlayerProgress,
  gain: Record<string, number>,
): PlayerProgress {
  const lifetimeCollected = { ...progress.lifetimeCollected };
  for (const [itemId, qty] of Object.entries(gain)) {
    if (!Number.isFinite(qty) || qty <= 0) continue;
    lifetimeCollected[itemId] = (lifetimeCollected[itemId] ?? 0) + qty;
  }
  return {
    lifetimeCollected,
    unlockedIndustries: evaluateUnlockedIndustries(lifetimeCollected, progress.unlockedIndustries),
  };
}

export function evaluateUnlockedIndustries(
  lifetimeCollected: Record<string, number>,
  already: readonly string[] = DEFAULT_UNLOCKED_INDUSTRIES,
): MilestoneIndustryId[] {
  const unlocked: MilestoneIndustryId[] = ["agriculture"];
  for (const id of already) {
    if (id !== "agriculture" && (MILESTONE_INDUSTRIES as readonly string[]).includes(id)) {
      if (!unlocked.includes(id as MilestoneIndustryId)) unlocked.push(id as MilestoneIndustryId);
    }
  }
  for (const spec of MILESTONE_UNLOCKS) {
    if (unlocked.includes(spec.industry)) continue;
    if ((lifetimeCollected[spec.itemId] ?? 0) + 1e-9 >= spec.qty) {
      unlocked.push(spec.industry);
    }
  }
  return unlocked;
}

export function milestoneLockReason(industry: MilestoneIndustryId): string | null {
  if (industry === "agriculture") return null;
  const spec = MILESTONE_UNLOCKS.find((row) => row.industry === industry);
  return spec ? `未解鎖：${spec.label}` : "未解鎖";
}
