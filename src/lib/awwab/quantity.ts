// Incremental quantity logs — pure helpers. Each log is a delta; the entry's `value`
// is always derived as the sum of its active logs, so calc.ts keeps reading `value`.
import type { DailyEntry, Entries, QuantityLog } from "./store";

const round = (n: number) => Math.round(n * 1000) / 1000;
export const logsTotal = (logs: QuantityLog[]) => round(logs.reduce((s, l) => s + l.value, 0));

/** Logs of an entry; a legacy single value (saved before logs existed) becomes one log. */
export function entryLogs(e: DailyEntry | undefined): QuantityLog[] {
  if (!e) return [];
  if (Array.isArray(e.logs)) return e.logs;
  if (typeof e.value === "number" && e.value > 0) return [{ id: `legacy-${e.date}-${e.activityId}`, value: e.value, at: e.updatedAt || e.createdAt || "" }];
  return [];
}

const validValue = (v: number) => Number.isFinite(v) && v > 0;

function withLogs(entries: Entries, date: string, activityId: string, logs: QuantityLog[], at: string): Entries {
  const day = { ...(entries[date] ?? {}) };
  const prev = day[activityId];
  if (!logs.length) delete day[activityId];
  else day[activityId] = { date, activityId, value: logsTotal(logs), completed: null, logs, createdAt: prev?.createdAt ?? at, updatedAt: at };
  return { ...entries, [date]: day };
}

/** Add a delta. Same `id` twice (double click / retry) is a no-op. Returns null when nothing changes. */
export function addLog(entries: Entries, date: string, activityId: string, id: string, value: number, at: string): Entries | null {
  if (!validValue(value)) return null;
  const logs = entryLogs(entries[date]?.[activityId]);
  if (logs.some((l) => l.id === id)) return null;
  return withLogs(entries, date, activityId, [...logs, { id, value, at }], at);
}

export function editLog(entries: Entries, date: string, activityId: string, id: string, value: number, at: string): Entries | null {
  if (!validValue(value)) return null;
  const logs = entryLogs(entries[date]?.[activityId]);
  if (!logs.some((l) => l.id === id)) return null;
  return withLogs(entries, date, activityId, logs.map((l) => (l.id === id ? { ...l, value, editedAt: at } : l)), at);
}

export function removeLog(entries: Entries, date: string, activityId: string, id: string, at: string): Entries | null {
  const logs = entryLogs(entries[date]?.[activityId]);
  if (!logs.some((l) => l.id === id)) return null;
  return withLogs(entries, date, activityId, logs.filter((l) => l.id !== id), at);
}
