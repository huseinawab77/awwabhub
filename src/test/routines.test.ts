import { describe, expect, it } from "vitest";
import { conflicts, occurrencesIn, occursOn, routineDetailsOn } from "@/lib/awwab/routines";
import { addOccurrencesToPlanner, getState, replaceState, saveRoutine, splitRoutine, type Routine, type RoutineException } from "@/lib/awwab/store";

const base: Routine = {
  id: "gym", title: "Gym", description: "", category: "HEALTH", type: "SCHEDULE", frequency: "WEEKLY", daysOfWeek: [0, 2, 4], intervalWeeks: 1,
  dayOfMonth: null, startTime: "17:00", endTime: "18:30", startDate: "2026-10-05", endDate: null, location: "", status: "ACTIVE", pausedFrom: null,
  pauses: [], plannerEnabled: true, calendarEnabled: true, activityId: null, goalId: null, projectId: null, milestoneId: null,
  createdAt: "", updatedAt: "", archivedAt: null,
};

describe("routines", () => {
  it("resolves separate weekday headings and multiline details with legacy fallback", () => {
    const r = { ...base, description: "General", weekdayDetails: { 0: { title: "Push day", description: "Bench press\nShoulder press" }, 2: { title: "Leg day", description: "Squat" } } };
    expect(routineDetailsOn(r, "2026-10-05")).toEqual({ title: "Gym — Push day", description: "Bench press\nShoulder press" });
    expect(routineDetailsOn(r, "2026-10-07").title).toBe("Gym — Leg day");
    expect(routineDetailsOn(r, "2026-10-09")).toEqual({ title: "Gym", description: "General" });
    expect(routineDetailsOn(base, "2026-10-05")).toEqual({ title: "Gym", description: "" });
  });
  it("retains original weekday content when moved and overrides details for one date only", () => {
    const r = { ...base, weekdayDetails: { 0: { title: "Push", description: "Bench" }, 2: { title: "Legs", description: "Squat" } } };
    const ex: RoutineException = { id: "e", routineId: base.id, occurrenceDate: "2026-10-05", type: "RESCHEDULED", newDate: "2026-10-07", newStartTime: null, newEndTime: null, note: "", createdAt: "", updatedAt: "" };
    expect(occurrencesIn([r], [ex], "2026-10-07", "2026-10-07")[0].title).toBe("Gym — Push");
    const occ = occurrencesIn([r], [{ ...ex, detailTitle: "Light push", detailDescription: "Stretch" }], "2026-10-05", "2026-10-12");
    expect(occ[0].description).toBe("Stretch");
    expect(occ.find((o) => o.originalDate === "2026-10-12")?.description).toBe("Bench");
  });
  it("persists weekday details without making plans or tracking entries; future edits preserve history", () => {
    replaceState({ routines: [base], entries: {}, plannerItems: [] });
    saveRoutine({ ...base, weekdayDetails: { 0: { title: "Push", description: "Bench" } } });
    const saved = JSON.parse(window.localStorage.getItem("awwab:v1") ?? "{}");
    replaceState(saved);
    expect(getState().routines[0].weekdayDetails?.[0]?.title).toBe("Push");
    expect(getState().plannerItems).toEqual([]);
    expect(getState().entries).toEqual({});
    splitRoutine(base.id, "2026-10-12", { weekdayDetails: { 0: { title: "New push", description: "Dumbbells" } } }, "2026-10-11");
    const occ = occurrencesIn(getState().routines, [], "2026-10-05", "2026-10-12");
    expect(occ[0].title).toBe("Gym — Push");
    expect(occ.find((o) => o.date === "2026-10-12")?.title).toBe("Gym — New push");
    addOccurrencesToPlanner([occ[0]]);
    expect(getState().plannerItems[0].description).toBe("Bench");
    expect(getState().plannerItems[0].title).toBe("Gym — Push");
    expect(getState().entries).toEqual({});
  });
  it("weekly Mon/Wed/Fri", () => {
    const occ = occurrencesIn([base], [], "2026-10-05", "2026-10-11");
    expect(occ.map((o) => o.date)).toEqual(["2026-10-05", "2026-10-07", "2026-10-09"]);
  });
  it("every 2 weeks and monthly", () => {
    expect(occursOn({ ...base, intervalWeeks: 2 }, "2026-10-12")).toBe(false);
    expect(occursOn({ ...base, intervalWeeks: 2 }, "2026-10-19")).toBe(true);
    expect(occursOn({ ...base, frequency: "MONTHLY", dayOfMonth: 15 }, "2026-11-15")).toBe(true);
  });
  it("exceptions change one occurrence only", () => {
    const ex: RoutineException[] = [
      { id: "1", routineId: "gym", occurrenceDate: "2026-10-05", type: "SKIPPED", newDate: null, newStartTime: null, newEndTime: null, note: "", createdAt: "", updatedAt: "" },
      { id: "2", routineId: "gym", occurrenceDate: "2026-10-07", type: "RESCHEDULED", newDate: "2026-10-08", newStartTime: "18:00", newEndTime: null, note: "", createdAt: "", updatedAt: "" },
    ];
    const occ = occurrencesIn([base], ex, "2026-10-05", "2026-10-11");
    expect(occ.find((o) => o.originalDate === "2026-10-05")?.exception?.type).toBe("SKIPPED");
    expect(occ.find((o) => o.originalDate === "2026-10-07")?.date).toBe("2026-10-08");
    expect(occ.find((o) => o.originalDate === "2026-10-09")?.exception).toBeNull();
  });
  it("pause and archive stop future occurrences but keep the past", () => {
    const paused = { ...base, status: "PAUSED" as const, pausedFrom: "2026-10-07" };
    expect(occursOn(paused, "2026-10-05")).toBe(true);
    expect(occursOn(paused, "2026-10-09")).toBe(false);
    const resumed = { ...base, pauses: [{ from: "2026-10-07", to: "2026-10-11" }] };
    expect(occursOn(resumed, "2026-10-09")).toBe(false);
    expect(occursOn(resumed, "2026-10-12")).toBe(true);
    expect(occursOn({ ...base, archivedAt: "2026-10-08" }, "2026-10-09")).toBe(false);
  });
  it("detects overlapping times", () => {
    const meet = { ...base, id: "m", title: "Meeting", startTime: "18:00", endTime: "19:00", daysOfWeek: [0] };
    expect(conflicts(occurrencesIn([base, meet], [], "2026-10-05", "2026-10-11"))).toHaveLength(1);
  });
});
