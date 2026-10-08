import { describe, expect, it } from "vitest";
import { famousQuotes, greetingPart, openingDue, openingSlot, quoteFor } from "./reminders";

describe("daily opening quotes", () => {
  it("has a well-filled pool", () => {
    expect(famousQuotes.length).toBeGreaterThanOrEqual(45);
    famousQuotes.forEach((q) => {
      expect(q.textId && q.textEn && q.author && q.reflectionId && q.reflectionEn).toBeTruthy();
    });
  });
  it("gives three different quotes for the same day (one per slot)", () => {
    const day = ["2026-10-08", 0, 1, 2] as const;
    const a = quoteFor(day[0], 0)!;
    const b = quoteFor(day[0], 1)!;
    const c = quoteFor(day[0], 2)!;
    expect(a.id === b.id || a.id === c.id || b.id === c.id).toBe(false);
  });
  it("is deterministic: same date+slot always returns the same quote", () => {
    expect(quoteFor("2026-10-08", 0)!.id).toBe(quoteFor("2026-11-08", 0)!.id);
    expect(quoteFor("2026-10-08", 2)!.id).toBe(quoteFor("2027-10-08", 2)!.id);
  });
  it("falls back to null on an empty pool", () => {
    expect(quoteFor("2026-10-08", 0, [])).toBeNull();
  });
  it("opens at most three times a day: due when unseen today or a later slot has begun", () => {
    expect(openingDue(null, -1, "2026-10-08", 0)).toBe(true);
    expect(openingDue("2026-10-08", 0, "2026-10-08", 0)).toBe(false); // same slot already seen
    expect(openingDue("2026-10-08", 0, "2026-10-08", 1)).toBe(true); // afternoon due after morning
    expect(openingDue("2026-10-08", 2, "2026-10-08", 1)).toBe(false); // evening already seen
    expect(openingDue("2026-10-07", 2, "2026-10-08", 0)).toBe(true); // new day resets
  });
  it("maps hour to opening slot", () => {
    expect(openingSlot(5)).toBe(0);
    expect(openingSlot(11)).toBe(0);
    expect(openingSlot(12)).toBe(1);
    expect(openingSlot(17)).toBe(1);
    expect(openingSlot(18)).toBe(2);
    expect(openingSlot(4)).toBe(0); // small hours count as the morning opening
  });
  it("greets by local hour", () => {
    expect(greetingPart(5)).toBe("morning");
    expect(greetingPart(12)).toBe("afternoon");
    expect(greetingPart(18)).toBe("evening");
    expect(greetingPart(4)).toBe("evening");
  });
});
