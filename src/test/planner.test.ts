import { describe, expect, it } from "vitest";
import { inboxItems, itemsOn, planVsReality } from "@/lib/awwab/planner";
import type { PlannerItem } from "@/lib/awwab/store";

const mk = (p: Partial<PlannerItem>): PlannerItem => ({
  id: Math.random().toString(36), title: "x", description: "", type: "TASK", category: "PERSONAL",
  date: "2026-10-05", startTime: null, endTime: null, status: "PLANNED",
  goalId: null, projectId: null, milestoneId: null, activityId: null,
  createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z", completedAt: null, ...p,
});
const week = { start: "2026-10-05", end: "2026-10-11" } as never;

describe("planner", () => {
  it("sorts timed items first", () => {
    const xs = [mk({ title: "a" }), mk({ title: "b", startTime: "08:00" })];
    expect(itemsOn(xs, "2026-10-05").map((i) => i.title)).toEqual(["b", "a"]);
  });
  it("inbox holds undated items only", () => {
    expect(inboxItems([mk({ date: null }), mk({})])).toHaveLength(1);
  });
  it("plan vs reality: notes excluded, future never unfinished", () => {
    const r = planVsReality([
      mk({ date: "2026-10-05" }),
      mk({ date: "2026-10-06", status: "COMPLETED" }),
      mk({ date: "2026-10-07", status: "CANCELLED" }),
      mk({ date: "2026-10-10" }),
      mk({ type: "NOTE" }),
    ], week, "2026-10-08");
    expect(r).toMatchObject({ planned: 4, completed: 1, cancelled: 1, unfinished: 1, upcoming: 1 });
  });
});
