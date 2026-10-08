// Goal / project / milestone derivations. Independent from Life Score by design.
import type { Goal, Milestone, Project, AppState } from "./store";

export const milestonesOf = (s: AppState, projectId: string) => s.milestones.filter((m) => m.projectId === projectId);
export const projectsOf = (s: AppState, goalId: string) => s.projects.filter((p) => p.goalId === goalId);

/** completed / total × 100; null when there are no milestones. */
export function projectProgress(s: AppState, p: Project): number | null {
  const ms = milestonesOf(s, p.id);
  if (!ms.length) return null;
  return Math.round((ms.filter((m) => m.status === "completed").length / ms.length) * 100);
}

export function projectStatus(s: AppState, p: Project): Project["status"] {
  if (p.status === "archived") return "archived";
  const ms = milestonesOf(s, p.id);
  if (ms.length && ms.every((m) => m.status === "completed")) return "completed";
  if (p.status === "completed") return ms.some((m) => m.status !== "completed") ? "in_progress" : "completed";
  if (ms.some((m) => m.status === "completed")) return "in_progress";
  return p.status;
}

/** Equal-weighted average of non-archived projects that have milestones; null if none. */
export function goalProgress(s: AppState, g: Goal): number | null {
  const ps = projectsOf(s, g.id).filter((p) => p.status !== "archived");
  const vals = ps.map((p) => projectProgress(s, p)).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function goalStatus(s: AppState, g: Goal): Goal["status"] {
  if (g.status === "archived") return "archived";
  const ps = projectsOf(s, g.id).filter((p) => p.status !== "archived");
  if (ps.length && ps.every((p) => projectStatus(s, p) === "completed")) return "completed";
  return "active";
}

export const isOverdue = (due: string | null, done: boolean, today: string) => !!due && due < today && !done;

export interface DatedItem {
  id: string;
  type: "goal" | "project" | "milestone";
  title: string;
  date: string;
  parent: string | null;
  status: string;
  done: boolean;
}

export function datedItems(s: AppState): DatedItem[] {
  const items: DatedItem[] = [];
  for (const g of s.goals) {
    if (g.targetDate && g.status !== "archived") {
      const st = goalStatus(s, g);
      items.push({ id: g.id, type: "goal", title: g.title, date: g.targetDate, parent: null, status: st, done: st === "completed" });
    }
  }
  for (const p of s.projects) {
    const goal = s.goals.find((g) => g.id === p.goalId);
    if (p.targetDate && p.status !== "archived" && goal?.status !== "archived") {
      const st = projectStatus(s, p);
      items.push({ id: p.id, type: "project", title: p.title, date: p.targetDate, parent: goal?.title ?? null, status: st, done: st === "completed" });
    }
  }
  for (const m of s.milestones) {
    const p = s.projects.find((x) => x.id === m.projectId);
    if (m.dueDate && p && p.status !== "archived")
      items.push({ id: m.id, type: "milestone", title: m.title, date: m.dueDate, parent: p.title, status: m.status, done: m.status === "completed" });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export const upcoming = (s: AppState, today: string, limit = 5) =>
  datedItems(s).filter((i) => !i.done && i.date >= today).slice(0, limit);
export const overdueItems = (s: AppState, today: string) =>
  datedItems(s).filter((i) => !i.done && i.date < today);
export type { Milestone };
