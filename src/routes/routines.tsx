import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, MapPin, MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { addDays, datesBetween, formatShort, fromKey, periodFor } from "@/lib/awwab/dates";
import { locale, useLang, useT } from "@/lib/awwab/i18n";
import { PLANNER_CATEGORIES } from "@/lib/awwab/planner";
import { WEEKDAYS, conflicts, isOff, occurrencesIn, scheduledMinutes, type Occurrence } from "@/lib/awwab/routines";
import {
  addOccurrencesToPlanner, archiveRoutine, deleteRoutine, pauseRoutine, resumeRoutine, useAppState,
  type PlannerCategory, type Routine, type RoutineStatus,
} from "@/lib/awwab/store";
import { meta, useToday } from "@/lib/awwab/useToday";
import { EmptyState, PageHeader, Stepper } from "@/components/awwab/ui";
import { OccurrenceDialog, RoutineForm, TodaySchedule, describeRoutine } from "@/components/awwab/Routines";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/routines")({
  head: () => meta("Routines — AWWAB", "Your recurring life schedule: classes, gym, meetings and meals — the structure of a normal week."),
  component: RoutinesPage,
});

function RoutinesPage() {
  const today = useToday();
  const t = useT();
  useLang();
  const s = useAppState();
  const [anchor, setAnchor] = useState(today);
  const week = periodFor("week", anchor);
  const days = datesBetween(week.start, week.end);
  const occ = useMemo(() => occurrencesIn(s.routines, s.routineExceptions, week.start, week.end), [s.routines, s.routineExceptions, week.start, week.end]);
  const clash = useMemo(() => conflicts(occ), [occ]);
  const [form, setForm] = useState<{ routine: Routine | null; occ: Occurrence | null } | null>(null);
  const [sel, setSel] = useState<Occurrence | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<PlannerCategory | "ALL">("ALL");
  const [status, setStatus] = useState<RoutineStatus>("ACTIVE");

  const lib = s.routines.filter((r) => r.status === status && (cat === "ALL" || r.category === cat) && (!q || `${r.title} ${r.location} ${r.description} ${Object.values(r.weekdayDetails ?? {}).map((x) => `${x?.title ?? ""} ${x?.description ?? ""}`).join(" ")}`.toLowerCase().includes(q.toLowerCase())));
  const toPlanner = () => {
    const n = addOccurrencesToPlanner(occ.filter((o) => o.routine.plannerEnabled && !isOff(o)));
    toast(n ? t("rt.addedPlanner", { n }) : t("rt.nothingNew"));
  };
  const hours = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={t("rt.eyebrow")} title={t("rt.title")} subtitle={t("rt.subtitle")}>
        <button className="btn btn-primary" onClick={() => setForm({ routine: null, occ: null })}><Plus className="h-4 w-4" />{t("rt.add")}</button>
      </PageHeader>

      {!s.routines.length ? (
        <EmptyState title={t("rt.empty")} body={t("rt.emptyBody")} action={<button className="btn btn-primary" onClick={() => setForm({ routine: null, occ: null })}>{t("rt.add")}</button>} />
      ) : (<>
        <TodaySchedule today={today} showLink={false} />

        <section aria-labelledby="rt-week">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="rt-week" className="text-h2">{t("rt.week")}</h2>
            <div className="flex flex-wrap gap-2">
              <Stepper label={week.label} onPrev={() => setAnchor(addDays(week.start, -7))} onNext={() => setAnchor(addDays(week.start, 7))} />
              {s.routines.some((r) => r.plannerEnabled) && <button className="btn btn-soft" onClick={toPlanner}>{t("rt.toPlanner")}</button>}
            </div>
          </div>
          <div className="planner-week">
            {days.map((d) => {
              const list = occ.filter((o) => o.date === d);
              const m = scheduledMinutes(occ, d);
              const dt = fromKey(d);
              return (
                <section key={d} className={`planner-day ${d === today ? "planner-day-today" : ""}`} aria-label={dt.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" })}>
                  <header className="flex items-baseline justify-between gap-2 px-3 pt-3">
                    <p><span className="text-caption">{dt.toLocaleDateString(locale(), { weekday: "short" })}</span> <span className="font-display text-lg font-semibold">{dt.getDate()}</span></p>
                    {m > 0 && <span className="text-[11px] text-muted-foreground">{t("rt.free", { h: hours(m) })}</span>}
                  </header>
                  <div className="space-y-1 px-2 pb-2 pt-1">
                    {list.length ? list.map((o) => (
                      <button key={o.key} onClick={() => setSel(o)} className={`block w-full rounded-sm bg-sage-soft px-2 py-1 text-left text-xs ${isOff(o) ? "line-through opacity-50" : ""}`}>
                         <span className="font-bold tabular-nums">{o.startTime ?? ""}</span> <span className="font-semibold break-words">{o.title}</span>
                         {o.description && <span className="mt-1 block whitespace-pre-wrap break-words text-muted-foreground">{o.description}</span>}
                      </button>
                    )) : <p className="px-1 py-1 text-xs text-muted-foreground">—</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        {clash.length > 0 && (
          <section className="rounded-lg bg-orange-soft/60 px-5 py-3" aria-labelledby="rt-clash">
            <h2 id="rt-clash" className="text-caption mb-1 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />{t("rt.conflicts")}</h2>
            <p className="mb-1 text-xs text-muted-foreground">{t("rt.conflictsBody")}</p>
            <ul className="text-sm">
              {clash.map(([a, b]) => <li key={a.key + b.key}><span className="font-semibold">{a.routine.title}</span> ↔ <span className="font-semibold">{b.routine.title}</span> <span className="text-muted-foreground">· {formatShort(a.date)} {a.startTime}</span></li>)}
            </ul>
          </section>
        )}

        <section aria-labelledby="rt-lib">
          <h2 id="rt-lib" className="text-h2 mb-3">{t("rt.library")}</h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <label className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className="field !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("rt.search")} aria-label={t("rt.search")} />
            </label>
            <select className="field !w-auto" value={cat} onChange={(e) => setCat(e.target.value as PlannerCategory | "ALL")} aria-label={t("pl.f.category")}>
              <option value="ALL">{t("rt.all")}</option>
              {PLANNER_CATEGORIES.map((c) => <option key={c} value={c}>{t(`pl.cat.${c}`)}</option>)}
            </select>
            <select className="field !w-auto" value={status} onChange={(e) => setStatus(e.target.value as RoutineStatus)} aria-label="Status">
              {(["ACTIVE", "PAUSED", "ARCHIVED"] as RoutineStatus[]).map((x) => <option key={x} value={x}>{t(`rt.st.${x}`)} ({s.routines.filter((r) => r.status === x).length})</option>)}
            </select>
          </div>
          {PLANNER_CATEGORIES.filter((c) => lib.some((r) => r.category === c)).map((c) => (
            <div key={c} className="mb-5">
              <h3 className="text-caption mb-2"><span className="planner-cat" data-cat={c}>{t(`pl.cat.${c}`)}</span></h3>
              <ul className="surface divide-y">
                {lib.filter((r) => r.category === c).map((r) => (
                   <li key={r.id} className="px-5 py-3">
                     <div className="flex items-center gap-3">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setForm({ routine: r, occ: null })}>
                      <p className="truncate font-semibold">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(`rt.type.${r.type}`)} · {describeRoutine(r, t)}
                        {r.location && <> · <MapPin className="inline h-3 w-3" /> {r.location}</>}
                      </p>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="btn btn-ghost !p-1.5" aria-label={r.title}><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setForm({ routine: r, occ: null })}>{t("pl.edit")}</DropdownMenuItem>
                        {r.status === "ACTIVE" && <DropdownMenuItem onSelect={() => pauseRoutine(r.id, today)}>{t("rt.pause")}</DropdownMenuItem>}
                        {r.status !== "ACTIVE" && <DropdownMenuItem onSelect={() => resumeRoutine(r.id, today, addDays(today, -1))}>{t("rt.resume")}</DropdownMenuItem>}
                        {r.status !== "ARCHIVED" && <DropdownMenuItem onSelect={() => archiveRoutine(r.id, today)}>{t("rt.archive")}</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => { if (window.confirm(t("rt.confirmDelete"))) deleteRoutine(r.id); }}>{t("rt.delete")}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                     </div>
                     {r.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{r.description}</p>}
                     <dl className="mt-2 space-y-2">
                       {WEEKDAYS.filter((n) => r.frequency === "DAILY" || ((r.frequency === "WEEKLY" || r.frequency === "CUSTOM") && r.daysOfWeek.includes(n))).map((n) => {
                         const detail = r.weekdayDetails?.[n];
                         if (!detail?.title && !detail?.description) return null;
                         return <div key={n} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 border-t pt-2">
                           <dt className="text-xs font-bold text-muted-foreground">{t(`wd.${n}`)}</dt>
                           <dd className="min-w-0 text-sm">{detail.title && <p className="break-words font-semibold">{detail.title}</p>}{detail.description && <p className="whitespace-pre-wrap break-words text-muted-foreground">{detail.description}</p>}</dd>
                         </div>;
                       })}
                     </dl>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!lib.length && <p className="text-sm text-muted-foreground">—</p>}
        </section>
        <p className="text-xs text-muted-foreground">{t("rt.note")}</p>
      </>)}

      <OccurrenceDialog occ={sel} onOpenChange={(o) => !o && setSel(null)} onEdit={(o) => setForm({ routine: o.routine, occ: o })} />
      <RoutineForm open={!!form} onOpenChange={(o) => !o && setForm(null)} routine={form?.routine ?? null} occurrence={form?.occ ?? null} today={today} />
    </div>
  );
}
