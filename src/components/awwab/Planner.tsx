import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Circle, ListTodo, MoreHorizontal, NotebookText, Sparkles, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { actName, useT, type T } from "@/lib/awwab/i18n";
import type { Period } from "@/lib/awwab/dates";
import { PLANNER_CATEGORIES, PLANNER_TYPES, itemsOn, linkableActivities, planVsReality } from "@/lib/awwab/planner";
import {
  deletePlannerItem, savePlannerItem, setPlannerStatus, useAppState,
  type AppState, type PlannerCategory, type PlannerItem, type PlannerType,
} from "@/lib/awwab/store";

const TYPE_ICON = { EVENT: CalendarClock, TASK: ListTodo, PLAN: Sparkles, NOTE: NotebookText } as const;

/** Display name of a linked activity, even if it was archived later (history stays intact). */
export function linkedActivityName(s: AppState, id: string | null, t: T) {
  if (!id) return null;
  const h = s.habits.find((x) => x.id === id);
  return h ? actName(h, t) : null;
}

export function PlannerItemRow({ item, onEdit, compact }: { item: PlannerItem; onEdit: (i: PlannerItem) => void; compact?: boolean }) {
  const t = useT();
  const s = useAppState();
  const Icon = TYPE_ICON[item.type];
  const act = linkedActivityName(s, item.activityId, t);
  const done = item.status === "COMPLETED";
  const cancelled = item.status === "CANCELLED";
  const canComplete = item.type !== "NOTE";
  return (
    <div className={`planner-item ${done || cancelled ? "planner-item-soft" : ""}`} data-type={item.type}>
      {canComplete ? (
        <button
          type="button"
          className="planner-check"
          onClick={() => setPlannerStatus(item.id, done ? "PLANNED" : "COMPLETED")}
          aria-label={`${item.title}: ${done ? t("pl.markPlanned") : t("pl.markDone")}`}
          aria-pressed={done}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : cancelled ? <XCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
        </button>
      ) : (
        <span className="planner-check" aria-hidden><Icon className="h-4 w-4" /></span>
      )}
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onEdit(item)}>
        <span className="flex flex-wrap items-baseline gap-x-2">
          {item.startTime && <span className="text-xs font-bold tabular-nums text-muted-foreground">{item.startTime}{item.endTime ? `–${item.endTime}` : ""}</span>}
          <span className={`font-semibold leading-snug ${cancelled ? "line-through" : ""}`}>{item.title}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Icon className="h-3 w-3" aria-hidden />{t(`pl.type.${item.type}`)}</span>
          <span aria-hidden>·</span>
          <span className="planner-cat" data-cat={item.category}>{t(`pl.cat.${item.category}`)}</span>
          {item.status !== "PLANNED" && <><span aria-hidden>·</span><span>{t(`pl.st.${item.status}`)}</span></>}
          {!compact && act && <><span aria-hidden>·</span><span>{t("pl.linked", { x: act })}</span></>}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {act && item.date && !cancelled && (
          <Link to="/daily" hash={`act-${item.activityId}`} className="btn btn-soft !px-2 !py-1 text-xs" title={t("pl.trackHint")}>
            {t("pl.trackNow")}
          </Link>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="btn btn-ghost !p-1.5" aria-label={`${item.title}: ${t("pl.edit")}`}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(item)}>{t("pl.edit")}</DropdownMenuItem>
            {canComplete && item.status !== "COMPLETED" && <DropdownMenuItem onSelect={() => setPlannerStatus(item.id, "COMPLETED")}>{t("pl.markDone")}</DropdownMenuItem>}
            {canComplete && item.status !== "PLANNED" && <DropdownMenuItem onSelect={() => setPlannerStatus(item.id, "PLANNED")}>{t("pl.markPlanned")}</DropdownMenuItem>}
            {canComplete && item.status !== "CANCELLED" && <DropdownMenuItem onSelect={() => setPlannerStatus(item.id, "CANCELLED")}>{t("pl.cancelItem")}</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => deletePlannerItem(item.id)}>{t("pl.delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

type Draft = Omit<PlannerItem, "id" | "createdAt" | "updatedAt" | "completedAt" | "status"> & { id?: string };

const blank = (date: string | null): Draft => ({
  title: "", description: "", type: "PLAN", category: "PERSONAL", date, startTime: null, endTime: null,
  goalId: null, projectId: null, milestoneId: null, activityId: null,
});

/** Simple first (title, type, category, date); links and times revealed on demand. */
export function PlannerItemForm({ open, onOpenChange, item, defaultDate, today }: {
  open: boolean; onOpenChange: (o: boolean) => void; item: PlannerItem | null; defaultDate: string | null; today: string;
}) {
  const t = useT();
  const s = useAppState();
  const [d, setD] = useState<Draft>(blank(defaultDate));
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (!open) return;
    setD(item ? { ...item } : blank(defaultDate));
    setMore(!!item && !!(item.startTime || item.description || item.activityId || item.goalId || item.projectId || item.milestoneId));
  }, [open, item, defaultDate]);

  const acts = useMemo(() => {
    const list = linkableActivities(s.habits, today);
    // Keep an already-linked (possibly archived) activity selectable so editing never drops history.
    if (d.activityId && !list.some((a) => a.id === d.activityId)) {
      const h = s.habits.find((x) => x.id === d.activityId);
      if (h) return [...list, { id: h.id, isSystem: h.isSystem, customName: h.customName } as (typeof list)[number]];
    }
    return list;
  }, [s.habits, today, d.activityId]);
  const goals = s.goals.filter((g) => g.status !== "archived" || g.id === d.goalId);
  const projects = s.projects.filter((p) => (!d.goalId || p.goalId === d.goalId) && (p.status !== "archived" || p.id === d.projectId));
  const milestones = s.milestones.filter((m) => !d.projectId || m.projectId === d.projectId);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = savePlannerItem({ ...d, startTime: d.startTime || null, endTime: d.endTime || null, date: d.date || null });
    if (id) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-cream sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-h2">{item ? t("pl.editTitle") : t("pl.newTitle")}</DialogTitle>
          <DialogDescription>{t("pl.trackHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.what")}</span>
            <input className="field" autoFocus required value={d.title} onChange={(e) => set("title", e.target.value)} /></label>

          <fieldset>
            <legend className="mb-1 text-sm font-bold">{t("pl.f.type")}</legend>
            <div className="flex flex-wrap gap-2">
              {PLANNER_TYPES.map((ty) => (
                <button key={ty} type="button" className={`pill ${d.type === ty ? "pill-on" : ""}`} aria-pressed={d.type === ty} onClick={() => set("type", ty as PlannerType)}>{t(`pl.type.${ty}`)}</button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.category")}</span>
              <select className="field" value={d.category} onChange={(e) => set("category", e.target.value as PlannerCategory)}>
                {PLANNER_CATEGORIES.map((c) => <option key={c} value={c}>{t(`pl.cat.${c}`)}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.date")}</span>
              <input className="field" type="date" value={d.date ?? ""} onChange={(e) => set("date", e.target.value || null)} />
              {!d.date && <span className="mt-1 block text-xs text-muted-foreground">{t("pl.f.noDate")}</span>}</label>
          </div>

          <button type="button" className="text-sm font-bold text-rose underline-offset-2 hover:underline" onClick={() => setMore(!more)} aria-expanded={more}>
            {more ? t("pl.f.less") : t("pl.f.more")}
          </button>

          {more && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.start")}</span>
                  <input className="field" type="time" value={d.startTime ?? ""} onChange={(e) => set("startTime", e.target.value || null)} /></label>
                <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.end")}</span>
                  <input className="field" type="time" value={d.endTime ?? ""} onChange={(e) => set("endTime", e.target.value || null)} /></label>
              </div>
              <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.desc")}</span>
                <textarea className="field min-h-20" value={d.description} onChange={(e) => set("description", e.target.value)} /></label>
              <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.activity")}</span>
                <select className="field" value={d.activityId ?? ""} onChange={(e) => set("activityId", e.target.value || null)}>
                  <option value="">{t("pl.f.none")}</option>
                  {acts.map((a) => <option key={a.id} value={a.id}>{actName(a, t)}</option>)}
                </select></label>
              <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.goal")}</span>
                <select className="field" value={d.goalId ?? ""} onChange={(e) => setD((x) => ({ ...x, goalId: e.target.value || null, projectId: null, milestoneId: null }))}>
                  <option value="">{t("pl.f.none")}</option>
                  {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select></label>
              <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.project")}</span>
                <select className="field" value={d.projectId ?? ""} onChange={(e) => setD((x) => ({ ...x, projectId: e.target.value || null, milestoneId: null }))}>
                  <option value="">{t("pl.f.none")}</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select></label>
              <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.milestone")}</span>
                <select className="field" value={d.milestoneId ?? ""} onChange={(e) => set("milestoneId", e.target.value || null)}>
                  <option value="">{t("pl.f.none")}</option>
                  {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select></label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</button>
            <button type="submit" className="btn btn-primary">{t("pl.save")}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Today's planner items — used on Home and Daily. */
export function TodayPlan({ today }: { today: string }) {
  const t = useT();
  const s = useAppState();
  const items = itemsOn(s.plannerItems, today);
  const [edit, setEdit] = useState<PlannerItem | null>(null);
  const [open, setOpen] = useState(false);
  const openEdit = (i: PlannerItem | null) => { setEdit(i); setOpen(true); };
  return (
    <section aria-labelledby="today-plan">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id="today-plan" className="text-h2">{t("pl.today")}</h2>
        <Link to="/planner" className="text-sm font-bold text-rose hover:underline">{t("nav.planner")} →</Link>
      </div>
      {items.length ? (
        <div className="surface divide-y">{items.map((i) => <PlannerItemRow key={i.id} item={i} onEdit={openEdit} compact />)}</div>
      ) : (
        <div className="surface flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-semibold">{t("pl.noToday")}</p>
            <p className="text-sm text-muted-foreground">{t("pl.noTodayBody")}</p>
          </div>
          <button type="button" className="btn btn-soft" onClick={() => openEdit(null)}>+ {t("pl.add")}</button>
        </div>
      )}
      <PlannerItemForm open={open} onOpenChange={setOpen} item={edit} defaultDate={today} today={today} />
    </section>
  );
}

/** Plan vs Reality — deterministic feedback, never scoring. */
export function PlanVsReality({ period, today }: { period: Period; today: string }) {
  const t = useT();
  const s = useAppState();
  const r = planVsReality(s.plannerItems, period, today);
  return (
    <section aria-labelledby="pvr">
      <h2 id="pvr" className="text-h2 mb-1">{t("pl.pvr")}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{t("pl.pvr.note")}</p>
      {r.planned === 0 ? (
        <p className="surface px-5 py-4 text-sm text-muted-foreground">{t("pl.pvr.none")}</p>
      ) : (
        <div className="surface space-y-4 p-5">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {([["planned", r.planned], ["completed", r.completed], ["cancelled", r.cancelled], ["unfinished", r.unfinished], ["upcoming", r.upcoming]] as const).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-beige/60 px-3 py-2">
                <dt className="text-caption">{t(`pl.pvr.${k}`)}</dt>
                <dd className="font-display text-2xl font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="space-y-1 text-sm">
            {r.byCategory.map((c) => (
              <li key={c.category} className="flex justify-between gap-3">
                <span className="planner-cat" data-cat={c.category}>{t(`pl.cat.${c.category}`)}</span>
                <span className="text-muted-foreground">{c.completed} / {c.planned}</span>
              </li>
            ))}
          </ul>
          {r.unfinished + r.cancelled > 0 && (
            <ul className="space-y-1 border-t pt-3 text-sm text-muted-foreground">
              <li>· {t("pl.pvr.q1")}</li>
              <li>· {t("pl.pvr.q2")}</li>
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
