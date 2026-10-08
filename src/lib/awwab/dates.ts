import { locale } from "./i18n";

// Local-date helpers. Dates are stored as YYYY-MM-DD strings in the user's local time.

export const pad = (n: number) => String(n).padStart(2, "0");
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayKey = () => toKey(new Date());
export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
export const daysInMonth = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

/** Monday-based week start. */
export const startOfWeek = (k: string) => {
  const d = fromKey(k);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  return addDays(k, -dow);
};

export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
}

export type PeriodKind = "week" | "month";
export interface Period {
  kind: PeriodKind;
  start: string;
  end: string;
  label: string;
}

const fmt = (k: string, o: Intl.DateTimeFormatOptions) => fromKey(k).toLocaleDateString(locale(), o);

export function periodFor(kind: PeriodKind, anchor: string): Period {
  if (kind === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return { kind, start, end, label: `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric" })}` };
  }
  const d = fromKey(anchor);
  const start = toKey(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = toKey(new Date(d.getFullYear(), d.getMonth(), daysInMonth(d.getFullYear(), d.getMonth())));
  return { kind, start, end, label: fmt(start, { month: "long", year: "numeric" }) };
}

export const previousPeriod = (p: Period) => periodFor(p.kind, addDays(p.start, -1));
export const nextPeriod = (p: Period) => periodFor(p.kind, addDays(p.end, 1));

/** Dates in the period that are not in the future. */
export const eligibleDates = (p: Period, today: string) =>
  p.start > today ? [] : datesBetween(p.start, p.end < today ? p.end : today);

export const formatLong = (k: string) => fmt(k, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
export const formatShort = (k: string) => fmt(k, { month: "short", day: "numeric" });
export const monthKey = (k: string) => k.slice(0, 7);
