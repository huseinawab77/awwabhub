import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Repeat } from "lucide-react";
import { RoutineDayFields } from "./RoutineDayFields";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { actName, useT, type T } from "@/lib/awwab/i18n";
import { addDays, formatLong, formatShort } from "@/lib/awwab/dates";
import { PLANNER_CATEGORIES, linkableActivities } from "@/lib/awwab/planner";
import { ROUTINE_TYPES, WEEKDAYS, dow, isOff, occurrencesIn, type Occurrence } from "@/lib/awwab/routines";
import {
  clearRoutineException, saveRoutine, setRoutineException, splitRoutine, useAppState,
  type PlannerCategory, type Routine, type RoutineFrequency, type RoutineInput, type RoutineType,
} from "@/lib/awwab/store";

const FREQS: RoutineFrequency[] = ["WEEKLY", "DAILY", "MONTHLY", "CUSTOM", "ONCE"];

export function describeRoutine(r: Routine, t: T) {
  const time = r.startTime ? ` · ${r.startTime}${r.endTime ? `–${r.endTime}` : ""}` : "";
  const days = () => r.daysOfWeek.slice().sort().map((d) => t(`wd.${d}`)).join(", ");
  switch (r.frequency) {
    case "DAILY": return t("rt.daily") + time;
    case "MONTHLY": return t("rt.monthlyOn", { d: r.dayOfMonth ?? Number(r.startDate.slice(8)) }) + time;
    case "ONCE": return t("rt.once", { d: formatShort(r.startDate) }) + time;
    default: return (r.intervalWeeks > 1 && r.frequency === "WEEKLY" ? `${t("rt.everyN", { n: r.intervalWeeks })}: ` : "") + days() + time;
  }
}

type Draft = RoutineInput;
const blank = (today: string): Draft => ({
  title: "", description: "", weekdayDetails: {}, category: "PERSONAL", type: "SCHEDULE", frequency: "WEEKLY", daysOfWeek: [], intervalWeeks: 1, dayOfMonth: null,
  startTime: null, endTime: null, startDate: today, endDate: null, location: "", plannerEnabled: false, calendarEnabled: true,
  activityId: null, goalId: null, projectId: null, milestoneId: null,
});

type Scope = "one" | "future" | "all";

/** Create/edit a routine. When opened from an occurrence, asks which occurrences the change applies to. */
export function RoutineForm({ open, onOpenChange, routine, occurrence, today }: {
  open: boolean; onOpenChange: (o: boolean) => void; routine: Routine | null; occurrence?: Occurrence | null; today: string;
}) {
  const t = useT();
  const s = useAppState();
  const [d, setD] = useState<Draft>(blank(today));
  const [scope, setScope] = useState<Scope>("future");
  const [err, setErr] = useState("");
  const [oneDetail, setOneDetail] = useState({ title: "", description: "" });
  useEffect(() => {
    if (!open) return;
    setD(routine ? { ...routine } : blank(today));
    setScope(occurrence ? "one" : "all");
    setErr("");
    setOneDetail({ title: occurrence?.exception?.detailTitle ?? routine?.weekdayDetails?.[dow(occurrence?.originalDate ?? today)]?.title ?? "", description: occurrence?.description ?? "" });
  }, [open, routine, occurrence, today]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const acts = useMemo(() => linkableActivities(s.habits, today), [s.habits, today]);
  const goals = s.goals.filter((g) => g.status !== "archived" || g.id === d.goalId);
  const projects = s.projects.filter((p) => !d.goalId || p.goalId === d.goalId);
  const milestones = s.milestones.filter((m) => !d.projectId || m.projectId === d.projectId);
  const needsDays = d.frequency === "WEEKLY" || d.frequency === "CUSTOM";
  const toggleDay = (n: number) => set("daysOfWeek", (d.daysOfWeek ?? []).includes(n) ? (d.daysOfWeek ?? []).filter((x) => x !== n) : [...(d.daysOfWeek ?? []), n]);
  const detailDays = d.frequency === "DAILY" ? WEEKDAYS : needsDays ? WEEKDAYS.filter((n) => d.daysOfWeek?.includes(n)) : [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (needsDays && !(d.daysOfWeek ?? []).length) { setErr(t("rt.f.needDays")); return; }
    const clean = { ...d, startTime: d.startTime || null, endTime: d.endTime || null, endDate: d.endDate || null };
    if (routine && occurrence && scope === "one") {
      setRoutineException({ ...occurrence.exception, routineId: routine.id, occurrenceDate: occurrence.originalDate, type: "RESCHEDULED", newDate: occurrence.date, newStartTime: clean.startTime, newEndTime: clean.endTime, detailTitle: oneDetail.title, detailDescription: oneDetail.description });
    } else if (routine && scope === "future") {
      const from = occurrence?.originalDate ?? today;
      splitRoutine(routine.id, from, { ...clean, startDate: from, endDate: clean.endDate && clean.endDate >= from ? clean.endDate : null }, addDays(from, -1));
    } else if (!saveRoutine(clean)) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-cream sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-h2">{routine ? t("rt.edit") : t("rt.add")}</DialogTitle>
          <DialogDescription>{t("rt.note")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {routine && (
            <fieldset>
              <legend className="mb-1 text-sm font-bold">{t("rt.applyTo")}</legend>
              <div className="flex flex-wrap gap-2">
                {(occurrence ? (["one", "future", "all"] as Scope[]) : (["future", "all"] as Scope[])).map((sc) => (
                  <button key={sc} type="button" className={`pill ${scope === sc ? "pill-on" : ""}`} aria-pressed={scope === sc} onClick={() => setScope(sc)}>{t(`rt.scope.${sc}`)}</button>
                ))}
              </div>
            </fieldset>
          )}
          {scope === "one" ? (
            <div className="space-y-3">
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.dayTitle")}</span><input className="field" value={oneDetail.title} onChange={(e) => setOneDetail({ ...oneDetail, title: e.target.value })} /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.dayDescription")}</span><textarea className="field min-h-28" value={oneDetail.description} onChange={(e) => setOneDetail({ ...oneDetail, description: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.start")}</span>
                <input className="field" type="time" value={d.startTime ?? ""} onChange={(e) => set("startTime", e.target.value || null)} /></label>
              <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.end")}</span>
                <input className="field" type="time" value={d.endTime ?? ""} onChange={(e) => set("endTime", e.target.value || null)} /></label>
            </div>
            </div>
          ) : (<>
          <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.title")}</span>
            <input className="field" autoFocus required value={d.title} onChange={(e) => set("title", e.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.category")}</span>
              <select className="field" value={d.category} onChange={(e) => set("category", e.target.value as PlannerCategory)}>
                {PLANNER_CATEGORIES.map((c) => <option key={c} value={c}>{t(`pl.cat.${c}`)}</option>)}
              </select></label>
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.type")}</span>
              <select className="field" value={d.type} onChange={(e) => set("type", e.target.value as RoutineType)}>
                {ROUTINE_TYPES.map((c) => <option key={c} value={c}>{t(`rt.type.${c}`)}</option>)}
              </select></label>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-bold">{t("rt.f.freq")}</legend>
            <div className="flex flex-wrap gap-2">
              {FREQS.map((f) => <button key={f} type="button" className={`pill ${d.frequency === f ? "pill-on" : ""}`} aria-pressed={d.frequency === f} onClick={() => set("frequency", f)}>{t(`rt.freq.${f}`)}</button>)}
            </div>
          </fieldset>
          {needsDays && (
            <fieldset>
              <legend className="mb-1 text-sm font-bold">{t("rt.f.days")}</legend>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((n) => <button key={n} type="button" className={`pill !px-2.5 ${d.daysOfWeek?.includes(n) ? "pill-on" : ""}`} aria-pressed={!!d.daysOfWeek?.includes(n)} onClick={() => toggleDay(n)}>{t(`wd.${n}`)}</button>)}
              </div>
              <div className="mt-2 flex gap-3 text-xs font-bold text-rose">
                <button type="button" onClick={() => set("daysOfWeek", [0, 1, 2, 3, 4])}>{t("rt.f.weekdays")}</button>
                <button type="button" onClick={() => set("daysOfWeek", [5, 6])}>{t("rt.f.weekend")}</button>
              </div>
              {err && <p className="mt-1 text-sm text-destructive" role="alert">{err}</p>}
            </fieldset>
          )}
          {d.frequency === "WEEKLY" && (
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.every")}</span>
              <input className="field w-24" type="number" min={1} max={8} value={d.intervalWeeks ?? 1} onChange={(e) => set("intervalWeeks", Math.max(1, Number(e.target.value) || 1))} /></label>
          )}
          {d.frequency === "MONTHLY" && (
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.dom")}</span>
              <input className="field w-24" type="number" min={1} max={31} value={d.dayOfMonth ?? Number(d.startDate.slice(8))} onChange={(e) => set("dayOfMonth", Math.min(31, Math.max(1, Number(e.target.value) || 1)))} /></label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.start")}</span>
              <input className="field" type="time" value={d.startTime ?? ""} onChange={(e) => set("startTime", e.target.value || null)} /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("pl.f.end")}</span>
              <input className="field" type="time" value={d.endTime ?? ""} onChange={(e) => set("endTime", e.target.value || null)} /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold">{d.frequency === "ONCE" ? t("pl.f.date") : t("rt.f.startDate")}</span>
              <input className="field" type="date" required value={d.startDate} disabled={!!routine && scope === "future"} onChange={(e) => set("startDate", e.target.value)} /></label>
            {d.frequency !== "ONCE" && (
              <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.endDate")}</span>
                <input className="field" type="date" value={d.endDate ?? ""} onChange={(e) => set("endDate", e.target.value || null)} /></label>
            )}
          </div>
          <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.location")}</span>
            <input className="field" value={d.location ?? ""} onChange={(e) => set("location", e.target.value)} /></label>
          <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.generalDescription")}</span>
            <textarea className="field min-h-16" value={d.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
          <RoutineDayFields days={detailDays} details={d.weekdayDetails ?? {}} onChange={(value) => set("weekdayDetails", value)} />
          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!d.calendarEnabled} onChange={(e) => set("calendarEnabled", e.target.checked)} />{t("rt.f.calendar")}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!d.plannerEnabled} onChange={(e) => set("plannerEnabled", e.target.checked)} />{t("rt.f.plannerOptional")}</label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
          </>)}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn btn-ghost" onClick={() => onOpenChange(false)}>{t("common.cancel")}</button>
            <button type="submit" className="btn btn-primary">{t("rt.save")}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** One occurrence: skip, reschedule, cancel or restore — the routine itself is never changed. */
export function OccurrenceDialog({ occ, onOpenChange, onEdit }: { occ: Occurrence | null; onOpenChange: (o: boolean) => void; onEdit: (o: Occurrence) => void }) {
  const t = useT();
  const [moving, setMoving] = useState(false);
  const [nd, setNd] = useState({ date: "", start: "", end: "" });
  useEffect(() => { if (occ) { setMoving(false); setNd({ date: occ.date, start: occ.startTime ?? "", end: occ.endTime ?? "" }); } }, [occ]);
  if (!occ) return null;
  const r = occ.routine;
  const close = () => onOpenChange(false);
  const mark = (type: "SKIPPED" | "CANCELLED") => { setRoutineException({ routineId: r.id, occurrenceDate: occ.originalDate, type, newDate: null, newStartTime: null, newEndTime: null }); close(); };
  return (
    <Dialog open={!!occ} onOpenChange={onOpenChange}>
      <DialogContent className="bg-cream sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h2">{occ.title}</DialogTitle>
          <DialogDescription>
            {formatLong(occ.date)}{occ.startTime ? ` · ${occ.startTime}${occ.endTime ? `–${occ.endTime}` : ""}` : ""}
            {occ.date !== occ.originalDate ? ` · ${t("rt.moved", { d: formatShort(occ.originalDate) })}` : ""}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm"><span className="planner-cat" data-cat={r.category}>{t(`pl.cat.${r.category}`)}</span> · {describeRoutine(r, t)}</p>
        {r.location && <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{r.location}</p>}
        {occ.description && <p className="whitespace-pre-wrap break-words text-sm">{occ.description}</p>}
        {isOff(occ) && <p className="text-sm font-bold">{occ.exception?.type === "SKIPPED" ? t("rt.skipped") : t("rt.cancelled")}</p>}
        {moving ? (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setRoutineException({ ...occ.exception, routineId: r.id, occurrenceDate: occ.originalDate, type: "RESCHEDULED", newDate: nd.date, newStartTime: nd.start || null, newEndTime: nd.end || null }); close(); }}>
            <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.newDate")}</span><input className="field" type="date" required value={nd.date} onChange={(e) => setNd({ ...nd, date: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <input className="field" type="time" aria-label={t("pl.f.start")} value={nd.start} onChange={(e) => setNd({ ...nd, start: e.target.value })} />
              <input className="field" type="time" aria-label={t("pl.f.end")} value={nd.end} onChange={(e) => setNd({ ...nd, end: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={() => setMoving(false)}>{t("common.cancel")}</button><button className="btn btn-primary">{t("common.save")}</button></div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2 pt-2">
            {occ.exception ? (
              <button className="btn btn-soft" onClick={() => { clearRoutineException(r.id, occ.originalDate); close(); }}>{t("rt.restore")}</button>
            ) : (<>
              <button className="btn btn-soft" onClick={() => mark("SKIPPED")}>{t("rt.skip")}</button>
              <button className="btn btn-soft" onClick={() => setMoving(true)}>{t("rt.reschedule")}</button>
              <button className="btn btn-ghost" onClick={() => mark("CANCELLED")}>{t("rt.cancelOcc")}</button>
            </>)}
            <button className="btn btn-ghost" onClick={() => { close(); onEdit(occ); }}>{t("pl.edit")}</button>
            {r.activityId && <Link to="/daily" hash={`act-${r.activityId}`} className="btn btn-primary">{t("pl.trackNow")}</Link>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OccurrenceRow({ o, onClick }: { o: Occurrence; onClick: () => void }) {
  const t = useT();
  const off = isOff(o);
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-beige/40 ${off ? "opacity-60" : ""}`}>
      <span className="w-24 shrink-0 text-sm font-bold tabular-nums">{o.startTime ? `${o.startTime}${o.endTime ? `–${o.endTime}` : ""}` : "—"}</span>
      <span className="min-w-0 flex-1">
        <span className={`block break-words font-semibold ${off ? "line-through" : ""}`}>{o.title}</span>
        {o.description && <span className="mt-1 block whitespace-pre-wrap break-words text-sm text-muted-foreground">{o.description}</span>}
        <span className="text-xs text-muted-foreground">
          <span className="planner-cat" data-cat={o.routine.category}>{t(`pl.cat.${o.routine.category}`)}</span>
          {o.routine.location ? ` · ${o.routine.location}` : ""}
          {off ? ` · ${o.exception?.type === "SKIPPED" ? t("rt.skipped") : t("rt.cancelled")}` : o.date !== o.originalDate ? ` · ${t("rt.moved", { d: formatShort(o.originalDate) })}` : ""}
        </span>
      </span>
    </button>
  );
}

/** Today's routine schedule — used on Home and Routines. */
export function TodaySchedule({ today, showLink = true }: { today: string; showLink?: boolean }) {
  const t = useT();
  const s = useAppState();
  const occ = useMemo(() => occurrencesIn(s.routines, s.routineExceptions, today, today), [s.routines, s.routineExceptions, today]);
  const [sel, setSel] = useState<Occurrence | null>(null);
  const [edit, setEdit] = useState<Occurrence | null>(null);
  if (showLink && !s.routines.length) return null;
  return (
    <section aria-labelledby="today-schedule">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id="today-schedule" className="text-h2 flex items-center gap-2"><Repeat className="h-5 w-5" />{t("rt.today")}</h2>
        {showLink && <Link to="/routines" className="text-sm font-bold text-rose hover:underline">{t("nav.routines")} →</Link>}
      </div>
      {occ.length ? (
        <div className="surface divide-y">{occ.map((o) => <OccurrenceRow key={o.key} o={o} onClick={() => setSel(o)} />)}</div>
      ) : (
        <p className="surface px-5 py-4 text-sm"><span className="font-semibold">{t("rt.noToday")}</span> <span className="text-muted-foreground">{t("rt.noTodayBody")}</span></p>
      )}
      <OccurrenceDialog occ={sel} onOpenChange={(o) => !o && setSel(null)} onEdit={setEdit} />
      <RoutineForm open={!!edit} onOpenChange={(o) => !o && setEdit(null)} routine={edit?.routine ?? null} occurrence={edit} today={today} />
    </section>
  );
}
