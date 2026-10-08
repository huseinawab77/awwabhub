import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, datesBetween, formatLong, formatShort, fromKey, nextPeriod, periodFor, previousPeriod, startOfWeek } from "@/lib/awwab/dates";
import { datedItems, upcoming, type DatedItem } from "@/lib/awwab/goals";
import { useAppState, type PlannerCategory, type PlannerItem, type PlannerType } from "@/lib/awwab/store";
import { meta, useToday } from "@/lib/awwab/useToday";
import { PageHeader, Stepper } from "@/components/awwab/ui";
import { useLang, useT } from "@/lib/awwab/i18n";
import { isOff, occurrencesIn, type Occurrence } from "@/lib/awwab/routines";
import { describeRoutine } from "@/components/awwab/Routines";

export const Route = createFileRoute("/calendar")({
  head: () => meta("Calendar — AWWAB", "Goal deadlines, project dates, milestones and planner items in one monthly view."),
  component: CalendarPage,
});

/** One calendar entry: a goal/project/milestone date or a dated planner item. */
type CalEntry =
  | ({ kind: "goalish" } & DatedItem)
  | { kind: "planner"; item: PlannerItem }
  | { kind: "routine"; occ: Occurrence };

const TYPE_CLS: Record<DatedItem["type"] | "planner", string> = { goal: "bg-rose-soft", project: "bg-orange-soft", milestone: "bg-beige", planner: "bg-sage-soft" };

function CalendarPage() {
  const today = useToday();
  const t = useT();
  useLang();
  const state = useAppState();
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState<CalEntry | null>(null);
  const month = periodFor("month", anchor);
  const gridStart = startOfWeek(month.start);
  const gridEnd = addDays(startOfWeek(month.end), 6);
  const items = useMemo<CalEntry[]>(() => {
    const goalish: CalEntry[] = datedItems(state).map((i) => ({ kind: "goalish", ...i }));
    const planned: CalEntry[] = state.plannerItems
      .filter((i) => i.date !== null)
      .map((item) => ({ kind: "planner", item }));
    const routines: CalEntry[] = occurrencesIn(state.routines.filter((r) => r.calendarEnabled), state.routineExceptions, gridStart, gridEnd)
      .filter((o) => !isOff(o))
      .map((occ) => ({ kind: "routine", occ }));
    return [...goalish, ...planned, ...routines];
  }, [state, gridStart, gridEnd]);
  const days = datesBetween(gridStart, gridEnd);
  const entryDate = (e: CalEntry) => (e.kind === "planner" ? e.item.date! : e.kind === "routine" ? e.occ.date : e.date);
  const entryTime = (e: CalEntry) => (e.kind === "planner" ? (e.item.startTime ?? "99:99") : e.kind === "routine" ? (e.occ.startTime ?? "99:99") : "99:98");
  const byDate = (d: string) =>
    items
      .filter((i) => entryDate(i) === d)
      .sort((a, b) => {
        return entryTime(a).localeCompare(entryTime(b));
      });
  const next = upcoming(state, today, 6);

  return (
    <div>
      <PageHeader eyebrow={t("nav.calendar")} title={month.label} subtitle={t("cal.subtitle")}>
        <Stepper label={month.label} onPrev={() => setAnchor(previousPeriod(month).start)} onNext={() => setAnchor(nextPeriod(month).start)}>
          <button className="btn btn-ghost" onClick={() => setAnchor(today)}>{t("daily.today")}</button>
        </Stepper>
      </PageHeader>

      <div className="overflow-hidden rounded-lg border bg-cream">
        <div className="grid grid-cols-7 border-b text-center text-caption">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => <div key={d} className="py-2">{t(`wd.${d}`)}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const inMonth = d >= month.start && d <= month.end;
            const list = byDate(d);
            return (
              <div key={d} className={`min-h-20 border-b border-r p-1 sm:min-h-24 sm:p-1.5 ${inMonth ? "" : "bg-background/70 text-muted-foreground"}`}>
                <span className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${d === today ? "bg-primary text-primary-foreground" : ""}`}>{fromKey(d).getDate()}</span>
                <div className="mt-1 space-y-1">
                  {list.slice(0, 3).map((i) => {
                    const cls = i.kind === "planner" ? TYPE_CLS.planner : i.kind === "routine" ? "border border-dashed border-sage bg-cream" : TYPE_CLS[i.type];
                    const title = i.kind === "planner" ? i.item.title : i.kind === "routine" ? i.occ.title : i.title;
                    const done = i.kind === "planner" ? i.item.status !== "PLANNED" : i.kind === "routine" ? false : i.done;
                    const time = i.kind === "planner" ? i.item.startTime : i.kind === "routine" ? i.occ.startTime : null;
                    const k = i.kind === "planner" ? i.item.id : i.kind === "routine" ? i.occ.key : i.id;
                    return (
                      <button key={`${i.kind}-${k}`} onClick={() => setSelected(i)} className={`block w-full truncate rounded-sm px-1 py-0.5 text-left text-[11px] font-semibold ${cls} ${done ? "line-through opacity-60" : ""}`}>
                        {time ? `${time} ` : ""}{title}
                      </button>
                    );
                  })}
                  {list.length > 3 && <span className="text-[11px] text-muted-foreground">+{list.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-rose-soft" /> {t("type.goal")}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-orange-soft" /> {t("type.project")}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-beige" /> {t("type.milestone")}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-sage-soft" /> {t("type.planner")}</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm border border-dashed border-sage bg-cream" /> {t("type.routine")}</span>
      </div>

      {selected && selected.kind === "routine" && (
        <div className="surface mt-6 p-5">
          <p className="text-caption">{t("type.routine")}</p>
          <h2 className="text-h2">{selected.occ.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatLong(selected.occ.date)}{selected.occ.startTime ? ` · ${selected.occ.startTime}${selected.occ.endTime ? `–${selected.occ.endTime}` : ""}` : ""}
            {" · "}<span className="planner-cat" data-cat={selected.occ.routine.category}>{t(`pl.cat.${selected.occ.routine.category}`)}</span>
          </p>
          <p className="mt-1 text-sm">{describeRoutine(selected.occ.routine, t)}{selected.occ.routine.location ? ` · ${selected.occ.routine.location}` : ""}</p>
          {selected.occ.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{selected.occ.description}</p>}
          <div className="mt-3 flex gap-2">
            <Link to="/routines" className="btn btn-soft">{t("rt.open")}</Link>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>{t("common.close")}</button>
          </div>
        </div>
      )}

      {selected && selected.kind === "goalish" && (
        <div className="surface mt-6 p-5">
          <p className="text-caption">{t(`type.${selected.type}`)}</p>
          <h2 className="text-h2">{selected.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatLong(selected.date)}{selected.parent ? t("cal.in", { p: selected.parent }) : ""} · {t(`status.${selected.status}`)}
            {!selected.done && selected.date < today ? ` · ${t("common.overdue")}` : ""}
          </p>
          <div className="mt-3 flex gap-2">
            <Link to="/goals" className="btn btn-soft">{t("cal.open")}</Link>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>{t("common.close")}</button>
          </div>
        </div>
      )}

      {selected && selected.kind === "planner" && (
        <div className="surface mt-6 p-5">
          <p className="text-caption">{t(`pl.type.${selected.item.type as PlannerType}`)}</p>
          <h2 className="text-h2">{selected.item.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatLong(selected.item.date!)}
            {selected.item.startTime ? ` · ${selected.item.startTime}${selected.item.endTime ? `–${selected.item.endTime}` : ""}` : ""}
            {" · "}<span className="planner-cat" data-cat={selected.item.category as PlannerCategory}>{t(`pl.cat.${selected.item.category}`)}</span>
            {" · "}{t(`pl.st.${selected.item.status}`)}
          </p>
          {selected.item.description && <p className="mt-2 text-sm">{selected.item.description}</p>}
          <div className="mt-3 flex gap-2">
            <Link to="/planner" className="btn btn-soft">{t("cal.openPlanner")}</Link>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>{t("common.close")}</button>
          </div>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-h2 mb-3">{t("cal.upcoming")}</h2>
        {next.length ? (
          <ul className="surface divide-y">
            {next.map((i) => (
              <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{t(`type.${i.type}`)}{i.parent ? ` · ${i.parent}` : ""}</p>
                </div>
                <span className="text-sm text-muted-foreground">{formatShort(i.date)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("cal.nothing")}</p>
        )}
      </section>
    </div>
  );
}
