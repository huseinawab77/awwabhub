// Persistent local-storage abstraction. Raw user input only — never calculated values.
import { useSyncExternalStore } from "react";
import { addLog, editLog, removeLog } from "./quantity";
import { isDomainId, latestVersion, systemHabits, type DomainId, type Frequency, type Habit, type HabitVersion, type InputType } from "./config";

export interface DailyEntry {
  date: string;
  activityId: string;
  value: number | null; // quantitative
  completed: boolean | null; // checklist: null = no data, false = explicitly not done
  /** Quantitative deltas; when present, `value` is always their sum. */
  logs?: QuantityLog[];
  createdAt: string;
  updatedAt: string;
}
export interface QuantityLog { id: string; value: number; at: string; editedAt?: string }
export type Entries = Record<string, Record<string, DailyEntry>>; // date -> activityId -> entry

export type GoalStatus = "active" | "completed" | "archived";
export interface Goal {
  id: string;
  title: string;
  description: string;
  domainId: string | null;
  status: GoalStatus;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}
export type ProjectStatus = "not_started" | "in_progress" | "completed" | "archived";
export interface Project {
  id: string;
  goalId: string;
  title: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: "pending" | "completed";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface Review {
  id: string;
  period: string; // YYYY-MM
  snapshot: {
    lifeScore: number | null;
    strongestDomain: string | null;
    needsAttention: string | null;
    biggestImprovement: string | null;
    biggestDecline: string | null;
    goalProgress: Record<string, number | null>;
  };
  wentWell: string;
  difficult: string;
  change: string;
  stop: string;
  continue: string;
  nextFocus: string;
  createdAt: string;
  updatedAt: string;
}

export type PlannerType = "EVENT" | "TASK" | "PLAN" | "NOTE";
export type PlannerCategory = "ACADEMIC" | "ORGANIZATION" | "CAREER" | "HEALTH" | "FINANCE" | "PERSONAL" | "SOCIAL" | "LIFE_MANAGEMENT";
export type PlannerStatus = "PLANNED" | "COMPLETED" | "CANCELLED";
/** Intention, never behavior: planner items are not scoring evidence. date = null → Inbox. */
export interface PlannerItem {
  id: string;
  title: string;
  description: string;
  type: PlannerType;
  category: PlannerCategory;
  date: string | null;
  startTime: string | null; // HH:MM
  endTime: string | null;
  status: PlannerStatus;
  goalId: string | null;
  projectId: string | null;
  milestoneId: string | null;
  activityId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  routineId?: string | null; // set when generated from a routine
  occurrenceDate?: string | null; // the routine occurrence this item came from
}

export type RoutineType = "EVENT" | "HABIT" | "SCHEDULE" | "MEAL" | "STUDY" | "RESPONSIBILITY" | "OTHER";
export type RoutineFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM" | "ONCE";
export type RoutineStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export interface RoutineDayDetail {
  title: string;
  description: string;
}
/** Recurring TEMPLATE. Occurrences are derived (routines.ts), never stored; exceptions override single dates. */
export interface Routine {
  id: string;
  title: string;
  description: string;
  category: PlannerCategory;
  type: RoutineType;
  weekdayDetails?: Partial<Record<number, RoutineDayDetail>>; // Mon=0..Sun=6; missing fields use general details
  frequency: RoutineFrequency;
  daysOfWeek: number[]; // Mon=0..Sun=6 (WEEKLY/CUSTOM)
  intervalWeeks: number; // WEEKLY: every N weeks
  dayOfMonth: number | null; // MONTHLY
  startTime: string | null;
  endTime: string | null;
  startDate: string;
  endDate: string | null;
  location: string;
  status: RoutineStatus;
  pausedFrom: string | null; // while PAUSED
  pauses: { from: string; to: string }[]; // past pause windows (history)
  plannerEnabled: boolean;
  calendarEnabled: boolean;
  activityId: string | null;
  goalId: string | null;
  projectId: string | null;
  milestoneId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null; // date key: no occurrences on/after
}
export type RoutineExceptionType = "SKIPPED" | "RESCHEDULED" | "CANCELLED";
export interface RoutineException {
  id: string;
  routineId: string;
  occurrenceDate: string;
  type: RoutineExceptionType;
  newDate: string | null;
  newStartTime: string | null;
  newEndTime: string | null;
  detailTitle?: string;
  detailDescription?: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  version: 1;
  entries: Entries;
  goals: Goal[];
  projects: Project[];
  milestones: Milestone[];
  reviews: Review[];
  habits: Habit[];
  plannerItems: PlannerItem[];
  routines: Routine[];
  routineExceptions: RoutineException[];
  /** Local YYYY-MM-DD of the last Daily Opening seen; lastOpeningSlot (0-2, -1 = none) tracks
   * which of the day's three openings (morning/afternoon/evening) was last seen. Never affects scores. */
  lastOpeningDate: string | null;
  lastOpeningSlot: number;
}

const KEY = "awwab:v1";
const EMPTY: AppState = { version: 1, entries: {}, goals: [], projects: [], milestones: [], reviews: [], habits: systemHabits(), plannerItems: [], routines: [], routineExceptions: [], lastOpeningDate: null, lastOpeningSlot: -1 };

const arr = <X>(x: unknown): X[] => (Array.isArray(x) ? (x as X[]) : []);
const validHabit = (h: Habit) => !!h && typeof h.id === "string" && Array.isArray(h.versions) && h.versions.length > 0 && h.versions.every((v) => isDomainId(v.domain));

let state: AppState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function parseState(p: any): AppState {
  const habits = arr<Habit>(p?.habits).filter(validHabit);
  const hasHabitList = Array.isArray(p?.habits) && p.habits.length === habits.length; // user may have deleted every built-in
  return {
    version: 1,
    entries: p?.entries && typeof p.entries === "object" ? p.entries : {},
    goals: arr(p?.goals),
    projects: arr(p?.projects),
    milestones: arr(p?.milestones),
    reviews: arr(p?.reviews),
    habits: habits.length || hasHabitList ? habits : systemHabits(),
    plannerItems: arr<PlannerItem>(p?.plannerItems).filter((x) => !!x && typeof x.id === "string" && typeof x.title === "string"),
    routines: arr<Routine>(p?.routines).filter((x) => !!x && typeof x.id === "string" && typeof x.startDate === "string").map((r) => ({ ...r, daysOfWeek: arr<number>(r.daysOfWeek), pauses: arr(r.pauses), intervalWeeks: r.intervalWeeks || 1 })),
    routineExceptions: arr<RoutineException>(p?.routineExceptions).filter((x) => !!x && typeof x.routineId === "string"),
    lastOpeningDate: typeof p?.lastOpeningDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.lastOpeningDate) ? p.lastOpeningDate : null,
    // States saved before the 3×-per-day change only had a date; treat that day as fully seen so nothing re-opens today.
    lastOpeningSlot: typeof p?.lastOpeningSlot === "number" && p.lastOpeningSlot >= -1 && p.lastOpeningSlot <= 2 ? p.lastOpeningSlot : (p?.lastOpeningDate ? 2 : -1),
  };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = parseState(JSON.parse(raw) ?? {});
  } catch {
    state = EMPTY;
  }
}

/** True when the device holds any user-entered data. */
export const hasLocalData = (s: AppState) =>
  Object.keys(s.entries).length > 0 || s.goals.length > 0 || s.reviews.length > 0 || s.plannerItems.length > 0 || s.routines.length > 0 || s.habits.some((h) => !h.isSystem || h.versions.length > 1);

/** Replace everything with a state loaded from the account (does not trigger a re-upload). */
export function replaceState(raw: unknown) {
  load();
  commit(parseState(raw), false);
}

const commitListeners = new Set<(s: AppState) => void>();
export const onCommit = (f: (s: AppState) => void) => { commitListeners.add(f); return () => { commitListeners.delete(f); }; };

function commit(next: AppState, notifySync = true): boolean {
  state = next;
  let saved = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    saved = false; /* storage full / unavailable */
  }
  listeners.forEach((l) => l());
  if (notifySync) commitListeners.forEach((l) => l(state));
  return saved;
}

export function getState() {
  load();
  return state;
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getState,
    () => EMPTY,
  );
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toISOString();

// ---------- Daily entries ----------
export function setEntry(date: string, activityId: string, patch: { value?: number | null; completed?: boolean | null }) {
  const s = getState();
  const day = { ...(s.entries[date] ?? {}) };
  const prev = day[activityId];
  const e: DailyEntry = {
    date,
    activityId,
    value: prev?.value ?? null,
    completed: prev?.completed ?? null,
    createdAt: prev?.createdAt ?? now(),
    updatedAt: now(),
    ...patch,
  };
  if (patch.value !== undefined) delete e.logs; // a direct value replaces any delta history
  else if (prev?.logs) e.logs = prev.logs;
  if (e.value === null && e.completed === null) delete day[activityId];
  else day[activityId] = e;
  commit({ ...s, entries: { ...s.entries, [date]: day } });
}

// ---------- Quantity logs (incremental deltas) ----------
/** "duplicate" = same id already saved (double click / retry). */
export type LogResult = "saved" | "duplicate" | "invalid" | "failed";
function applyEntries(next: Entries | null, fallback: LogResult): LogResult {
  if (!next) return fallback;
  return commit({ ...getState(), entries: next }) ? "saved" : "failed";
}
export const addQuantityLog = (date: string, activityId: string, id: string, value: number): LogResult => {
  if (!(Number.isFinite(value) && value > 0)) return "invalid";
  return applyEntries(addLog(getState().entries, date, activityId, id, value, now()), "duplicate");
};
export const editQuantityLog = (date: string, activityId: string, id: string, value: number): LogResult =>
  applyEntries(editLog(getState().entries, date, activityId, id, value, now()), "invalid");
export const deleteQuantityLog = (date: string, activityId: string, id: string): LogResult =>
  applyEntries(removeLog(getState().entries, date, activityId, id, now()), "invalid");

// ---------- Goals / projects / milestones ----------
export function saveGoal(g: Partial<Goal> & { title: string; id?: string | undefined }) {
  const s = getState();
  if (g.id && s.goals.some((x) => x.id === g.id)) {
    commit({ ...s, goals: s.goals.map((x) => (x.id === g.id ? { ...x, ...g, updatedAt: now() } : x)) });
    return g.id;
  }
  const goal: Goal = { id: uid(), description: "", domainId: null, status: "active", targetDate: null, createdAt: now(), updatedAt: now(), ...g };
  commit({ ...s, goals: [...s.goals, goal] });
  return goal.id;
}

export function saveProject(p: Partial<Project> & { title: string; goalId: string; id?: string | undefined }) {
  const s = getState();
  if (p.id && s.projects.some((x) => x.id === p.id)) {
    commit({ ...s, projects: s.projects.map((x) => (x.id === p.id ? { ...x, ...p, updatedAt: now() } : x)) });
    return p.id;
  }
  const proj: Project = { id: uid(), description: "", status: "not_started", startDate: null, targetDate: null, createdAt: now(), updatedAt: now(), ...p };
  commit({ ...s, projects: [...s.projects, proj] });
  return proj.id;
}

export function saveMilestone(m: Partial<Milestone> & { title: string; projectId: string }) {
  const s = getState();
  if (m.id && s.milestones.some((x) => x.id === m.id)) {
    commit({ ...s, milestones: s.milestones.map((x) => (x.id === m.id ? { ...x, ...m, updatedAt: now() } : x)) });
    return m.id;
  }
  const ms: Milestone = { id: uid(), description: "", dueDate: null, status: "pending", completedAt: null, createdAt: now(), updatedAt: now(), ...m };
  commit({ ...s, milestones: [...s.milestones, ms] });
  return ms.id;
}

export function toggleMilestone(id: string) {
  const s = getState();
  commit({
    ...s,
    milestones: s.milestones.map((m) =>
      m.id === id
        ? { ...m, status: m.status === "completed" ? "pending" : "completed", completedAt: m.status === "completed" ? null : now(), updatedAt: now() }
        : m,
    ),
  });
}

export function deleteMilestone(id: string) {
  const s = getState();
  commit({ ...s, milestones: s.milestones.filter((m) => m.id !== id) });
}

// ---------- Reviews ----------
export function saveReview(r: Omit<Review, "id" | "createdAt" | "updatedAt">) {
  const s = getState();
  const existing = s.reviews.find((x) => x.period === r.period);
  if (existing) {
    commit({ ...s, reviews: s.reviews.map((x) => (x.id === existing.id ? { ...x, ...r, updatedAt: now() } : x)) });
  } else {
    commit({ ...s, reviews: [...s.reviews, { ...r, id: uid(), createdAt: now(), updatedAt: now() }] });
  }
}

// ---------- Habits (versioned configuration) ----------
export interface HabitInput {
  name: string;
  domain: DomainId;
  inputType: InputType;
  target: number;
  unit: string;
  frequency: Frequency;
  weight: number;
}

/** A daily checklist only means "done"; a higher daily target is counted as an amount instead. */
const normalize = <V extends { inputType: InputType; frequency: Frequency; target: number; unit: string }>(v: V) =>
  v.inputType === "checklist" && v.frequency === "day"
    ? v.target > 1 ? { inputType: "quantitative" as InputType, target: v.target, unit: v.unit && v.unit !== "day" ? v.unit : "times" } : { target: 1 }
    : { target: v.target };

/** Adds a new version effective `today`; replaces a version already created today. Never rewrites the past. */
function withVersion(h: Habit, today: string, patch: Partial<HabitVersion>): Habit {
  const last = latestVersion(h);
  const next: HabitVersion = { ...last, ...patch, effectiveFrom: today };
  const versions = last.effectiveFrom >= today ? [...h.versions.slice(0, -1), next] : [...h.versions, next];
  return { ...h, versions, updatedAt: now() };
}

const updateHabitState = (id: string, f: (h: Habit) => Habit) => {
  const s = getState();
  commit({ ...s, habits: s.habits.map((h) => (h.id === id ? f(h) : h)) });
};

export function createHabit(input: HabitInput, today: string) {
  const s = getState();
  const { name, ...v } = input;
  const h: Habit = {
    id: `h_${uid()}`,
    isSystem: false,
    customName: name.trim(),
    createdAt: now(),
    updatedAt: now(),
    archivedAt: null,
    versions: [{ ...v, ...normalize(v), effectiveFrom: today, active: true }],
  };
  commit({ ...s, habits: [...s.habits, h] });
  return h.id;
}

/** `customName` null keeps the translated system name. */
export function updateHabit(id: string, customName: string | null, v: Omit<HabitInput, "name">, today: string) {
  updateHabitState(id, (h) => ({
    ...withVersion(h, today, { ...v, ...normalize(v) }),
    customName,
  }));
}

export function archiveHabit(id: string, today: string) {
  updateHabitState(id, (h) => ({ ...withVersion(h, today, { active: false }), archivedAt: now() }));
}

export function reactivateHabit(id: string, today: string) {
  updateHabitState(id, (h) => ({ ...withVersion(h, today, { active: true }), archivedAt: null }));
}

export const habitHasHistory = (s: AppState, id: string) => Object.values(s.entries).some((day) => !!day[id]);

/** Hard delete. With `force`, also allowed when history exists (entries stay stored but are no longer scored). */
export function deleteHabit(id: string, force = false) {
  const s = getState();
  if (!force && habitHasHistory(s, id)) return false;
  commit({ ...s, habits: s.habits.filter((h) => h.id !== id) });
  return true;
}

/** Explicit, user-triggered: scales active weights in a domain so they total 100. */
export function rebalanceDomain(domain: DomainId, today: string) {
  const s = getState();
  const act = s.habits.filter((h) => { const v = latestVersion(h); return v.active && v.domain === domain; });
  const total = act.reduce((x, h) => x + latestVersion(h).weight, 0);
  if (!act.length) return;
  const ids = new Set(act.map((h) => h.id));
  let assigned = 0;
  commit({
    ...s,
    habits: s.habits.map((h) => {
      if (!ids.has(h.id)) return h;
      const isLast = h.id === act[act.length - 1].id;
      const w = isLast ? Math.round((100 - assigned) * 10) / 10 : Math.round((total ? (latestVersion(h).weight / total) * 100 : 100 / act.length) * 10) / 10;
      assigned += w;
      return withVersion(h, today, { weight: w });
    }),
  });
}


// ---------- Planner (intention only — never touches entries, milestones or scores) ----------
export type PlannerInput = Partial<Omit<PlannerItem, "createdAt" | "updatedAt">> & { title: string };

export function savePlannerItem(input: PlannerInput) {
  const s = getState();
  const title = input.title.trim();
  if (!title) return null;
  if (input.id && s.plannerItems.some((x) => x.id === input.id)) {
    commit({ ...s, plannerItems: s.plannerItems.map((x) => (x.id === input.id ? { ...x, ...input, title, updatedAt: now() } : x)) });
    return input.id;
  }
  const item: PlannerItem = {
    description: "", type: "PLAN", category: "PERSONAL", date: null, startTime: null, endTime: null, status: "PLANNED",
    goalId: null, projectId: null, milestoneId: null, activityId: null, completedAt: null,
    ...input, id: uid(), title, createdAt: now(), updatedAt: now(),
  };
  commit({ ...s, plannerItems: [...s.plannerItems, item] });
  return item.id;
}

export function setPlannerStatus(id: string, status: PlannerStatus) {
  const s = getState();
  commit({
    ...s,
    plannerItems: s.plannerItems.map((x) => (x.id === id ? { ...x, status, completedAt: status === "COMPLETED" ? now() : null, updatedAt: now() } : x)),
  });
}

export function deletePlannerItem(id: string) {
  const s = getState();
  commit({ ...s, plannerItems: s.plannerItems.filter((x) => x.id !== id) });
}

// ---------- Routines (recurring templates — never create tracking entries) ----------
export type RoutineInput = Partial<Omit<Routine, "createdAt" | "updatedAt">> & { title: string; startDate: string };

export function saveRoutine(input: RoutineInput) {
  const s = getState();
  const title = input.title.trim();
  if (!title) return null;
  if (input.id && s.routines.some((x) => x.id === input.id)) {
    commit({ ...s, routines: s.routines.map((x) => (x.id === input.id ? { ...x, ...input, title, updatedAt: now() } : x)) });
    return input.id;
  }
  const r: Routine = {
    description: "", weekdayDetails: {}, category: "PERSONAL", type: "SCHEDULE", frequency: "WEEKLY", daysOfWeek: [], intervalWeeks: 1, dayOfMonth: null,
    startTime: null, endTime: null, endDate: null, location: "", status: "ACTIVE", pausedFrom: null, pauses: [],
    plannerEnabled: false, calendarEnabled: true, activityId: null, goalId: null, projectId: null, milestoneId: null, archivedAt: null,
    ...input, id: uid(), title, createdAt: now(), updatedAt: now(),
  };
  commit({ ...s, routines: [...s.routines, r] });
  return r.id;
}

/** "This and future": ends the old routine the day before `from` and starts a copy with the changes. Past stays untouched. */
export function splitRoutine(id: string, from: string, patch: Partial<RoutineInput>, dayBefore: string) {
  const s = getState();
  const old = s.routines.find((r) => r.id === id);
  if (!old) return null;
  if (from <= old.startDate) { saveRoutine({ ...old, ...patch, id }); return id; }
  const copy: Routine = { ...old, ...patch, id: uid(), startDate: from, pauses: [], createdAt: now(), updatedAt: now() } as Routine;
  const routines = s.routines.map((r) => (r.id === id ? { ...r, endDate: dayBefore, updatedAt: now() } : r));
  // Exceptions on/after the split move with the new routine.
  const routineExceptions = s.routineExceptions.map((e) => (e.routineId === id && e.occurrenceDate >= from ? { ...e, routineId: copy.id } : e));
  commit({ ...s, routines: [...routines, copy], routineExceptions });
  return copy.id;
}

export function pauseRoutine(id: string, today: string) {
  const s = getState();
  commit({ ...s, routines: s.routines.map((r) => (r.id === id ? { ...r, status: "PAUSED", pausedFrom: today, updatedAt: now() } : r)) });
}
export function resumeRoutine(id: string, today: string, dayBefore: string) {
  const s = getState();
  commit({
    ...s,
    routines: s.routines.map((r) => r.id !== id ? r : {
      ...r, status: "ACTIVE", pausedFrom: null, updatedAt: now(), archivedAt: null,
      pauses: r.pausedFrom && r.pausedFrom <= dayBefore ? [...r.pauses, { from: r.pausedFrom, to: dayBefore }] : r.pauses,
    }),
  });
}
export function archiveRoutine(id: string, today: string) {
  const s = getState();
  commit({ ...s, routines: s.routines.map((r) => (r.id === id ? { ...r, status: "ARCHIVED", archivedAt: today, updatedAt: now() } : r)) });
}
/** Hard delete. Planner items generated from it are kept (history), only unlinked visually. */
export function deleteRoutine(id: string) {
  const s = getState();
  commit({ ...s, routines: s.routines.filter((r) => r.id !== id), routineExceptions: s.routineExceptions.filter((e) => e.routineId !== id) });
}

export function setRoutineException(x: Omit<RoutineException, "id" | "createdAt" | "updatedAt" | "note"> & { note?: string }) {
  const s = getState();
  const rest = s.routineExceptions.filter((e) => !(e.routineId === x.routineId && e.occurrenceDate === x.occurrenceDate));
  const prev = s.routineExceptions.find((e) => e.routineId === x.routineId && e.occurrenceDate === x.occurrenceDate);
  commit({ ...s, routineExceptions: [...rest, { note: "", ...x, id: prev?.id ?? uid(), createdAt: prev?.createdAt ?? now(), updatedAt: now() }] });
}
export function clearRoutineException(routineId: string, occurrenceDate: string) {
  const s = getState();
  commit({ ...s, routineExceptions: s.routineExceptions.filter((e) => !(e.routineId === routineId && e.occurrenceDate === occurrenceDate)) });
}

/** Creates planner items for the given occurrences, skipping ones already generated. Intention only. */
export function addOccurrencesToPlanner(occ: { routine: Routine; title?: string; description?: string; originalDate: string; date: string; startTime: string | null; endTime: string | null }[]) {
  const s = getState();
  const have = new Set(s.plannerItems.filter((i) => i.routineId).map((i) => `${i.routineId}|${i.occurrenceDate}`));
  const fresh: PlannerItem[] = occ.filter((o) => !have.has(`${o.routine.id}|${o.originalDate}`)).map((o) => ({
    id: uid(), title: o.title ?? o.routine.title, description: o.description ?? o.routine.description, type: "EVENT", category: o.routine.category,
    date: o.date, startTime: o.startTime, endTime: o.endTime, status: "PLANNED",
    goalId: o.routine.goalId, projectId: o.routine.projectId, milestoneId: o.routine.milestoneId, activityId: o.routine.activityId,
    routineId: o.routine.id, occurrenceDate: o.originalDate, createdAt: now(), updatedAt: now(), completedAt: null,
  }));
  if (fresh.length) commit({ ...s, plannerItems: [...s.plannerItems, ...fresh] });
  return fresh.length;
}

// ---------- Daily Opening ----------
/** Marks the opening seen for `date` at `slot` (0-2). Later slots on the same day still open. */
export function markOpeningSeen(date: string, slot: number) {
  const s = getState();
  const prevSlot = s.lastOpeningDate === date ? s.lastOpeningSlot : -1;
  if (prevSlot >= slot) return;
  commit({ ...s, lastOpeningDate: date, lastOpeningSlot: slot });
}
