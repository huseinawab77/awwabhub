import { beforeEach, describe, expect, it } from "vitest";
import { ACTIVITY_BY_ID, SYSTEM_HABITS, bonusFor, type Activity } from "@/lib/awwab/config";
import { activityPerformance, computePeriod, quantityBonus } from "@/lib/awwab/calc";
import { periodFor } from "@/lib/awwab/dates";
import { addLog, editLog, entryLogs, removeLog } from "@/lib/awwab/quantity";
import { addQuantityLog, deleteQuantityLog, getState, replaceState, type Entries } from "@/lib/awwab/store";

const D = "2026-09-09";
const week = periodFor("week", D);
const day = { kind: "week" as const, start: D, end: D, label: "" };
const after = "2026-10-01";
const chain = (e: Entries, ...steps: ((x: Entries) => Entries | null)[]) => steps.reduce((acc, f) => f(acc) ?? acc, e);

describe("incremental quantity logs", () => {
  it("protein 30 + 40 + 60 on one day totals 130", () => {
    const e = chain({}, (x) => addLog(x, D, "protein", "a", 30, "t"), (x) => addLog(x, D, "protein", "b", 40, "t"), (x) => addLog(x, D, "protein", "c", 60, "t"));
    expect(e[D]!["protein"]!.value).toBe(130);
    expect(entryLogs(e[D]!["protein"])).toHaveLength(3);
  });
  it("different dates never mix", () => {
    const e = chain({}, (x) => addLog(x, D, "protein", "a", 30, "t"), (x) => addLog(x, "2026-09-10", "protein", "b", 50, "t"));
    expect(e[D]!["protein"]!.value).toBe(30);
    expect(e["2026-09-10"]!["protein"]!.value).toBe(50);
  });
  it("edit and delete recalculate the total and score", () => {
    let e = chain({}, (x) => addLog(x, D, "protein", "a", 60, "t"), (x) => addLog(x, D, "protein", "b", 60, "t"));
    expect(activityPerformance(ACTIVITY_BY_ID["protein"], day, e, after).performance).toBe(100);
    e = editLog(e, D, "protein", "b", 30, "t")!;
    expect(e[D]!["protein"]!.value).toBe(90);
    expect(activityPerformance(ACTIVITY_BY_ID["protein"], day, e, after).performance).toBe(0);
    e = removeLog(e, D, "protein", "a", "t")!;
    expect(e[D]!["protein"]!.value).toBe(30);
    e = removeLog(e, D, "protein", "b", "t")!;
    expect(e[D]!["protein"]).toBeUndefined();
  });
  it("same id twice (double click / retry) is ignored", () => {
    const e = addLog({}, D, "protein", "a", 30, "t")!;
    expect(addLog(e, D, "protein", "a", 30, "t")).toBeNull();
  });
  it("legacy single value becomes the first log", () => {
    const e: Entries = { [D]: { protein: { date: D, activityId: "protein", value: 50, completed: null, createdAt: "", updatedAt: "" } } };
    expect(addLog(e, D, "protein", "x", 20, "t")![D]!["protein"]!.value).toBe(70);
  });
});

describe("store persistence", () => {
  beforeEach(() => { localStorage.clear(); replaceState({}); });
  it("double submit saves once and survives a reload", () => {
    expect(addQuantityLog(D, "protein", "id1", 30)).toBe("saved");
    expect(addQuantityLog(D, "protein", "id1", 30)).toBe("duplicate");
    expect(addQuantityLog(D, "protein", "id2", 0)).toBe("invalid");
    const reloaded = JSON.parse(localStorage.getItem("awwab:v1")!);
    expect(reloaded.entries[D].protein.value).toBe(30);
    expect(reloaded.entries[D].protein.logs).toHaveLength(1);
    expect(deleteQuantityLog(D, "protein", "id1")).toBe("saved");
    expect(getState().entries[D]?["protein"]).toBeUndefined();
  });
});

describe("base performance and diminishing bonus", () => {
  const reps: Activity = { ...ACTIVITY_BY_ID["daily_steps"], target: 10, bonus: { bonusEnabled: true, bonusRate: 0.25, bonusCap: 20 } };
  it("over target: progress above 100, base performance capped at 100", () => {
    const e = addLog({}, D, "protein", "a", 130, "t")!;
    const r = activityPerformance(ACTIVITY_BY_ID["protein"], day, e, after);
    expect(r.performance).toBe(100);
    expect(e[D]!["protein"]!.value).toBe(130); // actual kept above target
  });
  it("protein (nutrition) gets no bonus by default", () => {
    expect(ACTIVITY_BY_ID["protein"].bonus.bonusEnabled).toBe(false);
    const e = addLog({}, D, "protein", "a", 300, "t")!;
    expect(activityPerformance(ACTIVITY_BY_ID["protein"], day, e, after).bonus).toBe(0);
  });
  it("checklists never get a bonus", () => {
    const h = SYSTEM_HABITS.find((x) => x.id === "gym")!;
    expect(bonusFor(h, { ...h.versions[0]!, bonusEnabled: true }).bonusEnabled).toBe(false);
  });
  it("marginal rate: target 10, rep 11 adds 2.5 points, not 10", () => {
    expect(quantityBonus(11, 10, reps.bonus)).toBe(2.5);
    expect(quantityBonus(10, 10, reps.bonus)).toBe(0);
  });
  it("bonus is capped", () => expect(quantityBonus(1000, 10, reps.bonus)).toBe(20));
  it("bonus is separate: lifeScore unchanged, lifeBonus traceable to its activity", () => {
    const base = addLog({}, D, "daily_steps", "a", 6000, "t")!;
    const extra = addLog({}, D, "daily_steps", "a", 12000, "t")!;
    const p1 = computePeriod(day, base, after), p2 = computePeriod(day, extra, after);
    expect(p2.lifeScore).toBe(p1.lifeScore);
    expect(p1.lifeBonus).toBe(0);
    expect(p2.bonusSources[0]!.activityId).toBe("daily_steps");
    // 100% over × 0.25 = 25 → cap 20; × steps 20/100 × health 20/100 = 0.8
    expect(p2.lifeBonus).toBe(0.8);
  });
  it("weekly sum follows its period target, not a daily failure", () => {
    const e = chain({}, (x) => addLog(x, "2026-09-07", "deep_work", "a", 120, "t"), (x) => addLog(x, "2026-09-07", "deep_work", "b", 180, "t"));
    expect(activityPerformance(ACTIVITY_BY_ID["deep_work"], week, e, after).performance).toBe(50);
  });
});
