// Planner derivations. Planner data = INTENTION; it is never read by the scoring engine (calc.ts).
import { activitiesAt, type Habit } from "./config";
import type { Period } from "./dates";
import type { PlannerCategory, PlannerItem, PlannerType } from "./store";

export const PLANNER_TYPES: PlannerType[] = ["PLAN", "TASK", "EVENT", "NOTE"];
export const PLANNER_CATEGORIES: PlannerCategory[] = ["ACADEMIC", "ORGANIZATION", "CAREER", "HEALTH", "FINANCE", "PERSONAL", "SOCIAL", "LIFE_MANAGEMENT"];

/** Timed items first (by start time), then untimed by creation. */
export const sortItems = (xs: PlannerItem[]) =>
  [...xs].sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") || a.createdAt.localeCompare(b.createdAt));

export const itemsOn = (items: PlannerItem[], date: string) => sortItems(items.filter((i) => i.date === date));
export const inboxItems = (items: PlannerItem[]) => items.filter((i) => i.date === null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const itemsIn = (items: PlannerItem[], p: Period) => items.filter((i) => i.date !== null && i.date >= p.start && i.date <= p.end);

/** Activities that can be linked to NEW items (archived/inactive excluded; existing links stay intact). */
export const linkableActivities = (habits: Habit[], today: string) => activitiesAt(habits, today);

export interface PlanReality {
  planned: number;
  completed: number;
  cancelled: number;
  unfinished: number; // date passed, still PLANNED — future items are never unfinished
  upcoming: number;
  byCategory: { category: PlannerCategory; planned: number; completed: number }[];
}

/** Feedback only — never feeds Life Score. Notes are context, not commitments, so they're excluded. */
export function planVsReality(items: PlannerItem[], p: Period, today: string): PlanReality {
  const xs = itemsIn(items, p).filter((i) => i.type !== "NOTE");
  const cats = new Map<PlannerCategory, { planned: number; completed: number }>();
  for (const i of xs) {
    const c = cats.get(i.category) ?? { planned: 0, completed: 0 };
    c.planned++;
    if (i.status === "COMPLETED") c.completed++;
    cats.set(i.category, c);
  }
  return {
    planned: xs.length,
    completed: xs.filter((i) => i.status === "COMPLETED").length,
    cancelled: xs.filter((i) => i.status === "CANCELLED").length,
    unfinished: xs.filter((i) => i.status === "PLANNED" && i.date! < today).length,
    upcoming: xs.filter((i) => i.status === "PLANNED" && i.date! >= today).length,
    byCategory: PLANNER_CATEGORIES.filter((c) => cats.has(c)).map((c) => ({ category: c, ...cats.get(c)! })),
  };
}
