import data from "./reminders.data.json";

/** Daily Islamic Opening content. Qur'an text and translations come from Quran.com sources
 * (Arabic: Uthmani; ID: Kemenag RI; EN: Saheeh International). Hadith entries show a meaning
 * summary with a Sunnah.com reference; Arabic is omitted when not verified. */
export interface DailyReminder {
  id: string;
  dayOfMonth: number;
  type: "quran" | "hadith";
  arabicText: string | null;
  translationId: string;
  translationEn: string;
  source: string;
  sourceUrl: string;
  reference: string;
  authenticity: "quran" | "sahih";
  themeId: string;
  themeEn: string;
  reflectionId: string;
  reflectionEn: string;
}

export const dailyIslamicReminders = data as DailyReminder[];

/** Deterministic: the reminder for a local YYYY-MM-DD date is slot `day of month`. */
export function reminderFor(dateKey: string, list: DailyReminder[] = dailyIslamicReminders): DailyReminder | null {
  const day = Number(dateKey.slice(8, 10));
  const r = list[day - 1];
  return r && r.dayOfMonth === day && r.translationId && r.reference ? r : null;
}

export type GreetingPart = "morning" | "afternoon" | "evening";
export function greetingPart(hour: number): GreetingPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}
