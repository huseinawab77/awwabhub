// Calculation engine — pure functions. The only place scoring formulas live.
import { DOMAINS, SYSTEM_HABITS, activitiesAt, inDomain, type Activity, type BonusConfig, type DomainId, type Habit } from "./config";
import { addDays, datesBetween, daysInMonth, eligibleDates, fromKey, periodFor, previousPeriod, type Period } from "./dates";
import type { Entries } from "./store";

export type PerfStatus = "no_data" | "below_target" | "on_target";

export interface ActivityResult {
  activityId: string;
  target: number; // target for the eligible part of the period
  actual: number; // raw actual (count, total, or successful days)
  recorded: number; // days with data
  eligible: number; // eligible days in period
  denominator: number; // what actual is compared against
  performance: number | null; // 0–100, capped (base performance)
  progress: number | null; // actual / denominator × 100, uncapped — display only
  bonus: number; // diminishing bonus points (0 when disabled), never part of performance
  status: PerfStatus;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Date whose habit configuration applies to a period: its last elapsed day. */
export const configDate = (period: Period, today: string) =>
  period.start > today ? period.start : period.end < today ? period.end : today;

export type DataState = "NO_DATA" | "LIMITED_DATA" | "SUFFICIENT_DATA";

/**
 * Performance of one activity, judged against its OWN target frequency.
 * - daily_check / daily_threshold: successful days / eligible (elapsed) days — untracked days are not successes.
 * - frequency / sum: actual / full target for the period (gym 1 of 3×/week = 33.3%, never 1/7, never 100%).
 * No explicit entry at all → no_data (not a failure, contributes 0).
 */
export function activityPerformance(a: Activity, period: Period, entries: Entries, today: string): ActivityResult {
  const dates = eligibleDates(period, today);
  const base = { activityId: a.id, eligible: dates.length };
  const vals = dates.map((d) => entries[d]?.[a.id]).filter(Boolean);
  const none = (target: number): ActivityResult => ({ ...base, target, actual: 0, recorded: 0, denominator: 0, performance: null, progress: null, bonus: 0, status: "no_data" });
  const finish = (actual: number, denominator: number, recorded: number, tgt: number, bonus = 0): ActivityResult => {
    const performance = denominator > 0 ? round1(Math.min(actual / denominator, 1) * 100) : null;
    const progress = denominator > 0 ? round1((actual / denominator) * 100) : null;
    return { ...base, target: tgt, actual, recorded, denominator, performance, progress, bonus, status: performance === null ? "no_data" : performance >= 100 ? "on_target" : "below_target" };
  };
  const ps = fromKey(period.start);
  const periodDays = datesBetween(period.start, period.end).length;
  const perDay = (t: number) => (a.frequency === "week" ? t / 7 : a.frequency === "month" ? t / daysInMonth(ps.getFullYear(), ps.getMonth()) : t);
  // Expected occurrences for the whole period at the activity's own frequency.
  const expectedFor = (t: number) => (a.frequency === period.kind ? t : perDay(t) * periodDays);

  switch (a.scoring) {
    case "daily_check": {
      const rec = vals.filter((e) => e!.completed !== null);
      if (!rec.length) return none(a.target);
      const done = rec.filter((e) => e!.completed === true).length;
      return finish(done, dates.length, rec.length, a.target);
    }
    case "frequency": {
      const expected = round1(expectedFor(a.target));
      const rec = vals.filter((e) => e!.completed !== null);
      if (!rec.length) return none(expected);
      const done = rec.filter((e) => e!.completed === true).length;
      return finish(done, expected, rec.length, expected);
    }
    case "daily_threshold": {
      const rec = vals.filter((e) => typeof e!.value === "number");
      if (!rec.length) return none(a.target);
      const ok = rec.filter((e) => (e!.value as number) >= a.target).length;
      // Bonus: each day's capped bonus, averaged over eligible days (same denominator as performance).
      const dayBonus = rec.reduce((s, e) => s + quantityBonus(e!.value as number, a.target, a.bonus), 0);
      return finish(ok, dates.length, rec.length, a.target, dates.length ? round1(dayBonus / dates.length) : 0);
    }
    case "sum": {
      const expected = Math.round(expectedFor(a.target));
      const rec = vals.filter((e) => typeof e!.value === "number");
      if (!rec.length) return none(expected);
      const total = rec.reduce((s, e) => s + (e!.value as number), 0);
      return finish(total, expected, rec.length, expected, quantityBonus(total, expected, a.bonus));
    }
  }
}

/**
 * Diminishing bonus: each unit above target earns `bonusRate` × the normal per-unit value
 * (100 / target points), capped at `bonusCap`. Target 10, rate 0.25: unit 11 adds 2.5 points.
 */
export function quantityBonus(actual: number, target: number, cfg: BonusConfig): number {
  if (!cfg.bonusEnabled || target <= 0 || actual <= target) return 0;
  return round1(Math.min(((actual - target) / target) * 100 * cfg.bonusRate, cfg.bonusCap));
}

/**
 * Demonstrated contribution: Σ weight × score / Σ ALL weights (missing items count 0,
 * and are never removed from the denominator). Null only when nothing has data.
 */
export function demonstrated(items: { score: number | null; weight: number }[]): number | null {
  if (!items.some((i) => i.score !== null)) return null;
  const w = items.reduce((s, i) => s + i.weight, 0);
  if (!w) return null;
  return round1(items.reduce((s, i) => s + (i.score ?? 0) * i.weight, 0) / w);
}

export interface PeriodResult {
  period: Period;
  list: Activity[]; // habit configuration used for this period
  activities: Record<string, ActivityResult>;
  domains: Record<DomainId, number | null>; // demonstrated %, null = not enough data
  lifeScore: number | null; // Σ domainWeight × activityWeight × performance; null = NO_DATA (display as 0)
  recordedActivities: number;
  coverage: number; // 0–100, tracked activity-days / eligible activity-days — informational only
  dataState: DataState;
  /** Bonus Life Score points shown separately from (never added into) lifeScore. */
  lifeBonus: number;
  bonusSources: { activityId: string; bonus: number; points: number }[];
}

export function computePeriod(period: Period, entries: Entries, today: string, habits: Habit[] = SYSTEM_HABITS): PeriodResult {
  const list = activitiesAt(habits, configDate(period, today));
  const activities: Record<string, ActivityResult> = {};
  for (const a of list) activities[a.id] = activityPerformance(a, period, entries, today);
  const domains = {} as Record<DomainId, number | null>;
  for (const d of DOMAINS)
    domains[d.id] = demonstrated(inDomain(list, d.id).map((a) => ({ score: activities[a.id].performance, weight: a.weight })));
  const recordedActivities = Object.values(activities).filter((r) => r.status !== "no_data").length;
  const lifeScore = recordedActivities
    ? round1(DOMAINS.reduce((s, d) => s + (domains[d.id] ?? 0) * d.weight, 0) / DOMAINS.reduce((s, d) => s + d.weight, 0))
    : null;
  const elig = Object.values(activities).reduce((s, r) => s + r.eligible, 0);
  const coverage = elig ? round1((Object.values(activities).reduce((s, r) => s + Math.min(r.recorded, r.eligible), 0) / elig) * 100) : 0;
  const dataState: DataState = lifeScore === null ? "NO_DATA" : coverage >= SUFFICIENT_COVERAGE ? "SUFFICIENT_DATA" : "LIMITED_DATA";
  // Bonus uses the same weights as the base score: domainWeight × activityWeight share × bonus.
  const dSum = DOMAINS.reduce((s, d) => s + d.weight, 0);
  const bonusSources: PeriodResult["bonusSources"] = [];
  for (const d of DOMAINS) {
    const acts = inDomain(list, d.id);
    const aSum = acts.reduce((s, a) => s + a.weight, 0);
    if (!aSum) continue;
    for (const a of acts) {
      const b = activities[a.id].bonus;
      if (b > 0) bonusSources.push({ activityId: a.id, bonus: b, points: round1((b * (a.weight / aSum) * d.weight) / dSum) });
    }
  }
  const lifeBonus = round1(bonusSources.reduce((s, x) => s + x.points, 0));
  return { period, list, activities, domains, lifeScore, recordedActivities, coverage, dataState, lifeBonus, bonusSources };
}

/** Coverage (%) a period needs before it is treated as sufficient for comparisons. */
export const SUFFICIENT_COVERAGE = 40;
/** Max coverage gap (points) between two periods for their scores to be comparable. */
export const COMPARABLE_COVERAGE_GAP = 25;
export const comparable = (a: PeriodResult, b: PeriodResult) =>
  a.dataState === "SUFFICIENT_DATA" && b.dataState === "SUFFICIENT_DATA" && Math.abs(a.coverage - b.coverage) <= COMPARABLE_COVERAGE_GAP;

export type TrendDir = "improving" | "stable" | "declining";
export const TREND_THRESHOLD = 5;
export function trend(current: number | null, previous: number | null): { diff: number; dir: TrendDir } | null {
  if (current === null || previous === null) return null;
  const diff = round1(current - previous);
  return { diff, dir: diff >= TREND_THRESHOLD ? "improving" : diff <= -TREND_THRESHOLD ? "declining" : "stable" };
}

export interface Comparison {
  current: PeriodResult;
  previous: PeriodResult;
  life: ReturnType<typeof trend>;
  domainTrends: Record<DomainId, ReturnType<typeof trend>>;
  strongest: { id: DomainId; score: number } | null;
  weakest: { id: DomainId; score: number } | null;
  biggestImprovement: { id: DomainId; diff: number } | null;
  biggestDecline: { id: DomainId; diff: number } | null;
}

export function compare(period: Period, entries: Entries, today: string, habits: Habit[] = SYSTEM_HABITS): Comparison {
  const current = computePeriod(period, entries, today, habits);
  const previous = computePeriod(previousPeriod(period), entries, today, habits);
  const domainTrends = {} as Comparison["domainTrends"];
  const ok = comparable(current, previous);
  for (const d of DOMAINS) domainTrends[d.id] = ok ? trend(current.domains[d.id], previous.domains[d.id]) : null;
  const valid = DOMAINS.filter((d) => current.domains[d.id] !== null).map((d) => ({ id: d.id, score: current.domains[d.id] as number }));
  const strongest = valid.length ? valid.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const weakest = valid.length >= 2 ? valid.reduce((a, b) => (b.score < a.score ? b : a)) : null;
  const diffs = DOMAINS.filter((d) => domainTrends[d.id]).map((d) => ({ id: d.id, diff: domainTrends[d.id]!.diff }));
  const ups = diffs.filter((x) => x.diff >= TREND_THRESHOLD);
  const downs = diffs.filter((x) => x.diff <= -TREND_THRESHOLD);
  return {
    current,
    previous,
    life: comparable(current, previous) ? trend(current.lifeScore, previous.lifeScore) : null,
    domainTrends,
    strongest,
    weakest: weakest && strongest && weakest.id !== strongest.id ? weakest : null,
    biggestImprovement: ups.length ? ups.reduce((a, b) => (b.diff > a.diff ? b : a)) : null,
    biggestDecline: downs.length ? downs.reduce((a, b) => (b.diff < a.diff ? b : a)) : null,
  };
}

/** Life Scores of each week in a month (only weeks that have started). */
export function weeklyLifeScoresInMonth(month: Period, entries: Entries, today: string, habits: Habit[] = SYSTEM_HABITS) {
  const out: { week: number; score: number | null }[] = [];
  let k = month.start;
  let i = 1;
  while (k <= month.end && k <= today) {
    const wp = periodFor("week", k);
    out.push({ week: i, score: computePeriod(wp, entries, today, habits).lifeScore });
    i++;
    k = addDays(wp.end, 1);
  }
  return out;
}

export interface DailyPoint {
  date: string;
  score: number | null; // null = before the first tracking entry (shown as a gap, never 0-filled)
  newData: boolean; // whether anything was tracked on this exact date
}

/**
 * Life Score as of a date: rolling 7 days ending on `date`, using only entries dated on/before it
 * and the habit configuration effective on that date. Later entries never alter earlier snapshots.
 */
export function lifeScoreAsOf(date: string, entries: Entries, habits: Habit[] = SYSTEM_HABITS): number | null {
  const window: Period = { kind: "week", start: addDays(date, -6), end: date, label: "" };
  const past: Entries = {};
  for (const k of Object.keys(entries)) if (k >= window.start && k <= date) past[k] = entries[k];
  return computePeriod(window, past, date, habits).lifeScore;
}

const hasEntry = (entries: Entries, d: string) =>
  Object.values(entries[d] ?? {}).some((e) => e && (e.completed !== null || typeof e.value === "number"));

/** Day-by-day Life Score series ending today (inclusive). Real data only. */
export function dailyLifeScores(days: number, entries: Entries, today: string, habits: Habit[] = SYSTEM_HABITS): DailyPoint[] {
  const first = Object.keys(entries).filter((k) => hasEntry(entries, k)).sort()[0];
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const started = first !== undefined && d >= first;
    out.push({ date: d, score: started ? (lifeScoreAsOf(d, entries, habits) ?? 0) : null, newData: hasEntry(entries, d) });
  }
  return out;
}
