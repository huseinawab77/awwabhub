import { describe, expect, it } from "vitest";
import { ACTIVITY_BY_ID, SYSTEM_HABITS, validateConfig } from "@/lib/awwab/config";
import { activityPerformance, trend, demonstrated, computePeriod, compare, dailyLifeScores, lifeScoreAsOf } from "@/lib/awwab/calc";
import { periodFor } from "@/lib/awwab/dates";
import type { Entries } from "@/lib/awwab/store";

const e = (date: string, id: string, v: { value?: number | null; completed?: boolean | null }): Entries => ({
  [date]: { [id]: { date, activityId: id, value: v.value ?? null, completed: v.completed ?? null, createdAt: "", updatedAt: "" } },
});
const merge = (...xs: Entries[]): Entries => xs.reduce((acc, x) => {
  for (const [d, m] of Object.entries(x)) acc[d] = { ...(acc[d] ?? {}), ...m };
  return acc;
}, {} as Entries);

// 2026-09-07 is a Monday
const week = periodFor("week", "2026-09-09");
const after = "2026-10-01";

describe("calculation engine", () => {
  it("weights are valid", () => expect(validateConfig()).toEqual([]));
  it("week starts Monday", () => expect(week.start).toBe("2026-09-07"));
  it("weekly task judged against its own target: 1/3 = 33.3, 3/3 = 100, 4/3 capped", () => {
    const one = e("2026-09-07", "gym", { completed: true });
    expect(activityPerformance(ACTIVITY_BY_ID["gym"], week, one, after).performance).toBe(33.3);
    const three = merge(one, e("2026-09-09", "gym", { completed: true }), e("2026-09-11", "gym", { completed: true }));
    expect(activityPerformance(ACTIVITY_BY_ID["gym"], week, three, after).performance).toBe(100);
    const four = merge(three, e("2026-09-12", "gym", { completed: true }));
    expect(activityPerformance(ACTIVITY_BY_ID["gym"], week, four, after).performance).toBe(100);
  });
  it("one gym session mid-week is still 33.3, never 100", () => {
    expect(activityPerformance(ACTIVITY_BY_ID["gym"], week, e("2026-09-07", "gym", { completed: true }), "2026-09-07").performance).toBe(33.3);
  });
  it("monthly target: competition 1 of 2 = 50", () => {
    const m = periodFor("month", "2026-09-15");
    expect(activityPerformance(ACTIVITY_BY_ID["competition"], m, e("2026-09-03", "competition", { completed: true }), after).performance).toBe(50);
  });
  it("daily threshold over the full week: 2 of 7 successful days", () => {
    const x = merge(e("2026-09-07", "daily_steps", { value: 7000 }), e("2026-09-08", "daily_steps", { value: 5000 }), e("2026-09-09", "daily_steps", { value: 8000 }));
    expect(activityPerformance(ACTIVITY_BY_ID["daily_steps"], week, x, after).performance).toBe(28.6);
  });
  it("deep work accumulates weekly", () => {
    const x = merge(...[100, 90, 120, 80].map((v, i) => e(`2026-09-${String(7 + i).padStart(2, "0")}`, "deep_work", { value: v })));
    expect(activityPerformance(ACTIVITY_BY_ID["deep_work"], week, x, after).performance).toBe(65);
  });
  it("no data vs failed stay different", () => {
    expect(activityPerformance(ACTIVITY_BY_ID["gym"], week, {}, after).status).toBe("no_data");
    expect(activityPerformance(ACTIVITY_BY_ID["gym"], week, e("2026-09-07", "gym", { completed: false }), after).performance).toBe(0);
    expect(activityPerformance(ACTIVITY_BY_ID["protein"], week, e("2026-09-07", "protein", { value: 0 }), after).performance).toBe(0);
  });
  it("demonstrated never renormalizes missing weights", () => {
    expect(demonstrated([{ score: 50, weight: 30 }, { score: 40, weight: 40 }, { score: null, weight: 30 }])).toBe(31);
    expect(demonstrated([{ score: null, weight: 100 }])).toBeNull();
  });
  it("empty account → no data, no fake score", () => {
    const r = computePeriod(week, {}, after);
    expect(r.lifeScore).toBeNull();
    expect(r.dataState).toBe("NO_DATA");
  });
  it("gym 3/3 alone = 6 Life Score points", () => {
    const x = merge(e("2026-09-07", "gym", { completed: true }), e("2026-09-09", "gym", { completed: true }), e("2026-09-11", "gym", { completed: true }));
    expect(computePeriod(week, x, after).lifeScore).toBe(6);
  });
  it("one daily task done once contributes only its weighted share", () => {
    const r = computePeriod(week, e("2026-09-07", "reading", { completed: true }), "2026-09-07");
    expect(r.lifeScore).toBe(5); // 100% × 50% × 10%
  });
  it("only one domain has data → only its weighted share counts", () => {
    const days = ["07", "08", "09", "10", "11", "12", "13"].map((d) => `2026-09-${d}`);
    const x = merge(
      ...days.flatMap((d, i) => [e(d, "fruit_veg", { completed: i < 7 }), e(d, "daily_steps", { value: 9000 })]),
    );
    // fruit 100% × 20 + steps 100% × 20 = 40% demonstrated health; × 20% domain weight = 8 points.
    expect(computePeriod(week, x, after).domains.health).toBe(40);
    expect(computePeriod(week, x, after).lifeScore).toBe(8);
  });
  it("future dates never count as failures", () => {
    const r = computePeriod(week, e("2026-09-07", "reading", { completed: true }), "2026-09-07");
    expect(r.activities["reading"].eligible).toBe(1);
  });
  it("historical target change: past uses old target", () => {
    const habits = SYSTEM_HABITS.map((h) => h.id !== "gym" ? h : { ...h, versions: [...h.versions, { ...h.versions[0], effectiveFrom: "2026-09-14", target: 4 }] });
    const x = merge(e("2026-09-07", "gym", { completed: true }), e("2026-09-09", "gym", { completed: true }), e("2026-09-11", "gym", { completed: true }));
    expect(computePeriod(week, x, after, habits).activities["gym"].performance).toBe(100);
    const next = periodFor("week", "2026-09-16");
    const y = merge(e("2026-09-14", "gym", { completed: true }), e("2026-09-15", "gym", { completed: true }), e("2026-09-16", "gym", { completed: true }));
    expect(computePeriod(next, y, after, habits).activities["gym"].performance).toBe(75);
  });
  it("trend needs comparable coverage", () => {
    const sparse = e("2026-09-14", "gym", { completed: true });
    expect(compare(periodFor("week", "2026-09-16"), sparse, after).life).toBeNull();
  });
  it("daily graph: real progression, gaps before first entry, later data does not alter earlier days", () => {
    const x = merge(e("2026-10-02", "reading", { completed: true }), e("2026-10-03", "gym", { completed: true }));
    const s = dailyLifeScores(4, x, "2026-10-04");
    expect(s[0]).toEqual({ date: "2026-10-01", score: null, newData: false });
    expect(s[1].score).toBe(lifeScoreAsOf("2026-10-02", x));
    expect(s[1].score! < s[2].score!).toBe(true);
    const before = lifeScoreAsOf("2026-10-02", x);
    expect(lifeScoreAsOf("2026-10-02", merge(x, e("2026-10-05", "journaling", { completed: true })))).toBe(before);
  });
  it("month, year and leap boundaries", () => {
    for (const d of ["2026-11-01", "2027-01-01", "2028-02-29", "2028-03-01"]) {
      const s = dailyLifeScores(3, e(d, "reading", { completed: true }), d);
      expect(s).toHaveLength(3);
      expect(s[2].date).toBe(d);
      expect(s[2].score).toBeGreaterThan(0);
    }
    expect(periodFor("month", "2028-02-15").end).toBe("2028-02-29");
  });
});
