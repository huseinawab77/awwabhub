// Single source of truth for domains and the default (system) habit configuration.
// Habit configuration is versioned: every change creates a new version with an
// `effectiveFrom` date, so past periods are always calculated with the settings
// that were in effect at the time.

export type DomainId = "academic" | "health" | "finance" | "career" | "personal" | "social" | "life";

export interface Domain {
  id: DomainId;
  name: string; // English fallback; UI uses translations
  weight: number; // Life Score weight (%)
}

export const DOMAINS: Domain[] = [
  { id: "academic", name: "Academic", weight: 20 },
  { id: "health", name: "Health & Fitness", weight: 20 },
  { id: "finance", name: "Finance", weight: 10 },
  { id: "career", name: "Career", weight: 20 },
  { id: "personal", name: "Personal Development", weight: 10 },
  { id: "social", name: "Social & Relationships", weight: 10 },
  { id: "life", name: "Life Management", weight: 10 },
];

export const DOMAIN_BY_ID = Object.fromEntries(DOMAINS.map((d) => [d.id, d])) as Record<DomainId, Domain>;
export const isDomainId = (x: unknown): x is DomainId => typeof x === "string" && x in DOMAIN_BY_ID;

export type Frequency = "day" | "week" | "month";
export type InputType = "checklist" | "quantitative";

/**
 * How raw input becomes performance (derived from input type + frequency):
 * - daily_check:     checklist/day — completed days / eligible (elapsed) days
 * - frequency:       checklist/week|month — completed occurrences / full period target
 * - daily_threshold: quantitative/day — days at or above target / eligible (elapsed) days
 * - sum:             quantitative/week|month — accumulated total / full period target
 */
export type ScoringMode = "daily_check" | "frequency" | "daily_threshold" | "sum";

export const scoringFor = (inputType: InputType, frequency: Frequency): ScoringMode =>
  inputType === "checklist" ? (frequency === "day" ? "daily_check" : "frequency") : frequency === "day" ? "daily_threshold" : "sum";

export interface HabitVersion {
  effectiveFrom: string; // YYYY-MM-DD
  domain: DomainId;
  inputType: InputType;
  target: number;
  unit: string;
  frequency: Frequency;
  weight: number; // within domain (%)
  active: boolean;
  /** Optional diminishing bonus for useful extra quantity (quantitative only). Missing = system default. */
  bonusEnabled?: boolean;
  bonusRate?: number; // fraction of the normal per-unit value each unit above target earns (0.25 = a quarter)
  bonusCap?: number; // max bonus performance points per activity
}

export interface BonusConfig { bonusEnabled: boolean; bonusRate: number; bonusCap: number }
export const NO_BONUS: BonusConfig = { bonusEnabled: false, bonusRate: 0, bonusCap: 0 };
/** Activities where extra effort is genuinely beneficial. Nutrition/health targets (e.g. protein) stay off. */
export const SYSTEM_BONUS: Record<string, BonusConfig> = {
  deep_work: { bonusEnabled: true, bonusRate: 0.25, bonusCap: 20 },
  daily_steps: { bonusEnabled: true, bonusRate: 0.25, bonusCap: 20 },
};

export interface Habit {
  id: string; // stable, language-independent; never changes
  isSystem: boolean;
  customName: string | null; // user-entered name; null = translated system name
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  versions: HabitVersion[]; // sorted by effectiveFrom
}

/** A habit resolved for a specific date — what the calculation engine consumes. */
export interface Activity {
  id: string;
  isSystem: boolean;
  customName: string | null;
  domain: DomainId;
  inputType: InputType;
  target: number;
  unit: string;
  frequency: Frequency;
  scoring: ScoringMode;
  weight: number;
  bonus: BonusConfig;
}

const EPOCH = "1970-01-01";
type Def = Omit<HabitVersion, "effectiveFrom" | "active">;
const def = (domain: DomainId, inputType: InputType, target: number, unit: string, frequency: Frequency, weight: number): Def => ({ domain, inputType, target, unit, frequency, weight });

/** The 21 default AWWAB activities. */
export const SYSTEM_DEFAULTS: Record<string, Def> = {
  study_session: def("academic", "checklist", 5, "sessions", "week", 30),
  deep_work: def("academic", "quantitative", 600, "min", "week", 40),
  task_completion: def("academic", "checklist", 1, "day", "day", 30),
  gym: def("health", "checklist", 3, "sessions", "week", 30),
  daily_steps: def("health", "quantitative", 6000, "steps", "day", 20),
  protein: def("health", "quantitative", 120, "g", "day", 30),
  fruit_veg: def("health", "checklist", 1, "day", "day", 20),
  expense_tracking: def("finance", "checklist", 1, "day", "day", 100),
  skill_dev: def("career", "checklist", 1, "day", "day", 30),
  competition: def("career", "checklist", 2, "times", "month", 15),
  project_completion: def("career", "checklist", 1, "projects", "month", 30),
  professional_event: def("career", "checklist", 1, "events", "month", 10),
  networking: def("career", "checklist", 5, "connections", "week", 15),
  reading: def("personal", "checklist", 1, "day", "day", 50),
  journaling: def("personal", "checklist", 1, "day", "day", 50),
  family_time: def("social", "checklist", 2, "times", "month", 30),
  helping_others: def("social", "checklist", 3, "acts", "week", 30),
  friendship_followup: def("social", "checklist", 2, "times", "month", 20),
  relationship_followup: def("social", "checklist", 2, "times", "month", 20),
  laundry: def("life", "checklist", 1, "times", "week", 30),
  meal_planning: def("life", "checklist", 1, "times", "week", 70),
};

/** Targets the built-in labels describe; used to pre-fill older checklist-only versions when edited. */
export const LABEL_TARGETS: Record<string, { target: number; unit: string }> = {
  reading: { target: 10, unit: "pages" }, journaling: { target: 1, unit: "pages" }, fruit_veg: { target: 2, unit: "times" },
};

export const systemHabits = (): Habit[] =>
  Object.entries(SYSTEM_DEFAULTS).map(([id, d]) => ({
    id,
    isSystem: true,
    customName: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    archivedAt: null,
    versions: [{ ...d, effectiveFrom: EPOCH, active: true }],
  }));

export const SYSTEM_HABITS: Habit[] = systemHabits();

/** Version in effect on `date`, or null if the habit didn't exist yet. */
export function versionAt(h: Habit, date: string): HabitVersion | null {
  let v: HabitVersion | null = null;
  for (const x of h.versions) if (x.effectiveFrom <= date) v = x;
  return v;
}

export const latestVersion = (h: Habit): HabitVersion => h.versions[h.versions.length - 1];

export function toActivity(h: Habit, v: HabitVersion): Activity {
  return {
    id: h.id,
    isSystem: h.isSystem,
    customName: h.customName,
    domain: v.domain,
    inputType: v.inputType,
    target: v.target,
    unit: v.unit,
    frequency: v.frequency,
    scoring: scoringFor(v.inputType, v.frequency),
    weight: v.weight,
    bonus: bonusFor(h, v),
  };
}

export function bonusFor(h: Pick<Habit, "id" | "isSystem">, v: HabitVersion): BonusConfig {
  if (v.inputType !== "quantitative") return NO_BONUS;
  const base = h.isSystem ? (SYSTEM_BONUS[h.id] ?? NO_BONUS) : NO_BONUS;
  const enabled = v.bonusEnabled ?? base.bonusEnabled;
  if (!enabled) return NO_BONUS;
  return { bonusEnabled: true, bonusRate: Math.max(0, v.bonusRate ?? base.bonusRate), bonusCap: Math.max(0, v.bonusCap ?? base.bonusCap) };
}

/** Habits that are active on `date`, resolved with the configuration in effect then. */
export function activitiesAt(habits: Habit[], date: string): Activity[] {
  const out: Activity[] = [];
  for (const h of habits) {
    const v = versionAt(h, date);
    if (v && v.active) out.push(toActivity(h, v));
  }
  return out;
}

export const inDomain = (list: Activity[], domain: DomainId) => list.filter((a) => a.domain === domain);

/** Default system activities (used by tests and as fallback). */
export const ACTIVITIES: Activity[] = activitiesAt(SYSTEM_HABITS, EPOCH);
export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a])) as Record<string, Activity>;

/** Domains whose active activity weights don't total 100. Never silently normalized. */
export function weightIssues(list: Activity[]): { domain: DomainId; total: number }[] {
  const out: { domain: DomainId; total: number }[] = [];
  for (const d of DOMAINS) {
    const acts = inDomain(list, d.id);
    if (!acts.length) continue;
    const total = Math.round(acts.reduce((s, a) => s + a.weight, 0) * 10) / 10;
    if (total !== 100) out.push({ domain: d.id, total });
  }
  return out;
}

export function validateConfig(): string[] {
  const errors: string[] = [];
  const dsum = DOMAINS.reduce((s, d) => s + d.weight, 0);
  if (dsum !== 100) errors.push(`Domain weights total ${dsum}, expected 100`);
  for (const w of weightIssues(ACTIVITIES)) errors.push(`${w.domain} activity weights total ${w.total}, expected 100`);
  return errors;
}
