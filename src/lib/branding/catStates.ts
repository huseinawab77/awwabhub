// Single source of truth for the Life Score → cat state mapping. Consumes the existing Life Score; never recalculates it.
export type CatState = "resting" | "waking" | "steady" | "growing" | "thriving";

export const CAT_STATES: Record<CatState, { minScore: number; maxScore: number }> = {
  resting: { minScore: 0, maxScore: 39 },
  waking: { minScore: 40, maxScore: 59 },
  steady: { minScore: 60, maxScore: 74 },
  growing: { minScore: 75, maxScore: 89 },
  thriving: { minScore: 90, maxScore: 100 },
};

const ORDER: CatState[] = ["resting", "waking", "steady", "growing", "thriving"];

/** Default (brand) state when there is no score yet. Scores are rounded the same way they're displayed. */
export function resolveCatState(lifeScore: number | null | undefined): CatState {
  if (lifeScore === null || lifeScore === undefined || Number.isNaN(lifeScore)) return "steady";
  const s = Math.min(100, Math.max(0, Math.round(lifeScore)));
  return ORDER.find((k) => s >= CAT_STATES[k].minScore && s <= CAT_STATES[k].maxScore) ?? "steady";
}
