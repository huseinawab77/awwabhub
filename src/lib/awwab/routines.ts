// Routine derivations. Routines describe the recurring STRUCTURE of life (templates).
// Occurrences are computed deterministically; nothing here is read by calc.ts, so routines never affect Life Score.
import { addDays, datesBetween, fromKey, startOfWeek } from "./dates";
import type { Routine, RoutineException, RoutineType } from "./store";

export const ROUTINE_TYPES: RoutineType[] = ["SCHEDULE", "EVENT", "HABIT", "MEAL", "STUDY", "RESPONSIBILITY", "OTHER"];
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
export const dow = (k: string) => (fromKey(k).getDay() + 6) % 7; // Mon=0

export function routineDetailsOn(r: Routine, date: string) {
  const detail = r.weekdayDetails?.[dow(date)];
  const dayTitle = detail?.title?.trim() ?? "";
  return {
    title: dayTitle ? `${r.title} — ${dayTitle}` : r.title,
    description: detail?.description?.trim() || r.description || "",
  };
}

/** Does the template (ignoring exceptions) produce an occurrence on `date`? */
export function occursOn(r: Routine, date: string): boolean {
  if (date < r.startDate) return false;
  if (r.endDate && date > r.endDate) return false;
  if (r.archivedAt && date >= r.archivedAt) return false;
  if (r.status === "PAUSED" && r.pausedFrom && date >= r.pausedFrom) return false;
  if (r.pauses.some((p) => date >= p.from && date <= p.to)) return false;
  switch (r.frequency) {
    case "ONCE": return date === r.startDate;
    case "DAILY": return true;
    case "MONTHLY": return fromKey(date).getDate() === (r.dayOfMonth ?? fromKey(r.startDate).getDate());
    case "WEEKLY":
    case "CUSTOM": {
      if (!r.daysOfWeek.includes(dow(date))) return false;
      const n = Math.max(1, r.intervalWeeks || 1);
      if (n === 1 || r.frequency === "CUSTOM") return true;
      const weeks = Math.round((fromKey(startOfWeek(date)).getTime() - fromKey(startOfWeek(r.startDate)).getTime()) / (7 * 864e5));
      return weeks % n === 0;
    }
  }
}

export interface Occurrence {
  key: string;
  title: string;
  description: string;
  routine: Routine;
  originalDate: string; // date the template scheduled
  date: string; // actual date (differs when rescheduled)
  startTime: string | null;
  endTime: string | null;
  exception: RoutineException | null;
}

/** Occurrences shown in [start, end]. Skipped/cancelled ones are included (flagged) so the user can restore them. */
export function occurrencesIn(routines: Routine[], exceptions: RoutineException[], start: string, end: string): Occurrence[] {
  const ex = new Map(exceptions.map((e) => [`${e.routineId}|${e.occurrenceDate}`, e]));
  const out: Occurrence[] = [];
  // Look back/forward a little so occurrences rescheduled into the window are found.
  const scan = datesBetween(addDays(start, -31), addDays(end, 31));
  for (const r of routines) {
    for (const d of scan) {
      if (!occursOn(r, d)) continue;
      const e = ex.get(`${r.id}|${d}`) ?? null;
      const date = e?.type === "RESCHEDULED" && e.newDate ? e.newDate : d;
      if (date < start || date > end) continue;
      out.push({
        key: `${r.id}|${d}`, routine: r, originalDate: d, date, exception: e,
        title: e?.detailTitle !== undefined ? (e.detailTitle.trim() ? `${r.title} — ${e.detailTitle.trim()}` : r.title) : routineDetailsOn(r, d).title,
        description: e?.detailDescription ?? routineDetailsOn(r, d).description,
        startTime: e?.type === "RESCHEDULED" ? (e.newStartTime ?? r.startTime) : r.startTime,
        endTime: e?.type === "RESCHEDULED" ? (e.newEndTime ?? r.endTime) : r.endTime,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));
}

export const isOff = (o: Occurrence) => o.exception?.type === "SKIPPED" || o.exception?.type === "CANCELLED";
export const activeOn = (occ: Occurrence[], date: string) => occ.filter((o) => o.date === date && !isOff(o));

const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/** Pairs of timed occurrences on the same day whose times overlap. Informational only. */
export function conflicts(occ: Occurrence[]): [Occurrence, Occurrence][] {
  const out: [Occurrence, Occurrence][] = [];
  const timed = occ.filter((o) => !isOff(o) && o.startTime);
  for (let i = 0; i < timed.length; i++)
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i], b = timed[j];
      if (a.date !== b.date) continue;
      const aS = mins(a.startTime!), aE = a.endTime ? mins(a.endTime) : aS + 1;
      const bS = mins(b.startTime!), bE = b.endTime ? mins(b.endTime) : bS + 1;
      if (aS < bE && bS < aE) out.push([a, b]);
    }
  return out;
}

/** Total scheduled minutes per day (timed occurrences with an end). */
export function scheduledMinutes(occ: Occurrence[], date: string) {
  return activeOn(occ, date).reduce((m, o) => (o.startTime && o.endTime ? m + Math.max(0, mins(o.endTime) - mins(o.startTime)) : m), 0);
}
