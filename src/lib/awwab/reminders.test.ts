import { describe, expect, it } from "vitest";
import { dailyIslamicReminders, greetingPart, reminderFor } from "./reminders";

describe("daily reminders", () => {
  it("has 31 valid slots", () => {
    expect(dailyIslamicReminders).toHaveLength(31);
    dailyIslamicReminders.forEach((r, i) => {
      expect(r.dayOfMonth).toBe(i + 1);
      expect(r.reference && r.sourceUrl && r.translationId && r.translationEn && r.reflectionId && r.reflectionEn).toBeTruthy();
      if (r.type === "hadith") expect(r.arabicText).toBeNull();
    });
  });
  it("maps by day of month, same across months", () => {
    expect(reminderFor("2026-10-08")!.dayOfMonth).toBe(8);
    expect(reminderFor("2026-11-08")!.id).toBe(reminderFor("2026-10-08")!.id);
    expect(reminderFor("2028-02-29")!.dayOfMonth).toBe(29);
    expect(reminderFor("2026-12-31")!.dayOfMonth).toBe(31);
  });
  it("falls back to null on broken config", () => {
    expect(reminderFor("2026-10-08", [])).toBeNull();
  });
  it("greets by local hour", () => {
    expect(greetingPart(5)).toBe("morning");
    expect(greetingPart(12)).toBe("afternoon");
    expect(greetingPart(18)).toBe("evening");
    expect(greetingPart(4)).toBe("evening");
  });
});
