import data from "./quotes.data.json";

/** Daily Opening quotes: famous words from great figures — scholars, scientists, and leaders.
 * The Opening shows up to three times per day (morning / afternoon / evening), each with a
 * different quote chosen deterministically from the local date and the opening slot. */
export interface FamousQuote {
  id: string;
  textId: string;
  textEn: string;
  author: string;
  themeId: string;
  themeEn: string;
  reflectionId: string;
  reflectionEn: string;
}

export const famousQuotes = data as FamousQuote[];

/** Three openings per day: 0 = morning, 1 = afternoon, 2 = evening. */
export type OpeningSlot = 0 | 1 | 2;
export function openingSlot(hour: number): OpeningSlot {
  if (hour < 12) return 0;
  if (hour < 18) return 1;
  return 2;
}

/** Deterministic: local date + slot pick the quote; the pool cycles without repeating within a day. */
export function quoteFor(dateKey: string, slot: OpeningSlot, list: FamousQuote[] = famousQuotes): FamousQuote | null {
  if (!list.length) return null;
  const day = Number(dateKey.slice(8, 10));
  return list[((day - 1) * 3 + slot) % list.length];
}

/** The Opening is due when it has not been seen today, or when a later slot has begun. */
export function openingDue(lastDate: string | null, lastSlot: number, today: string, slot: OpeningSlot): boolean {
  return lastDate !== today || lastSlot < slot;
}

export type GreetingPart = "morning" | "afternoon" | "evening";
export function greetingPart(hour: number): GreetingPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}
