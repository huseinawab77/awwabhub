import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { addDays, datesBetween, formatShort, fromKey, periodFor } from "@/lib/awwab/dates";
import { datedItems, goalStatus } from "@/lib/awwab/goals";
import { locale, useLang, useT } from "@/lib/awwab/i18n";
import { inboxItems, itemsIn, itemsOn } from "@/lib/awwab/planner";
import { addOccurrencesToPlanner, savePlannerItem, useAppState, type PlannerItem } from "@/lib/awwab/store";
import { isOff, occurrencesIn } from "@/lib/awwab/routines";
import { toast } from "sonner";
import { meta, useToday } from "@/lib/awwab/useToday";
import { PageHeader, Stepper } from "@/components/awwab/ui";
import { PlannerItemForm, PlannerItemRow, PlanVsReality } from "@/components/awwab/Planner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/planner")({
  head: () => meta("Planner — AWWAB", "Plan your week: events, tasks, plans and notes, kept separate from what you actually track."),
  component: PlannerPage,
});

function PlannerPage() {
  const today = useToday();
  const t = useT();
  useLang();
  const s = useAppState();
  const [anchor, setAnchor] = useState(today);
  const week = periodFor("week", anchor);
  const days = datesBetween(week.start, week.end);
  const isThisWeek = week.start <= today && week.end >= today;
  const weekItems = itemsIn(s.plannerItems, week);
  const inbox = inboxItems(s.plannerItems);
  const important = useMemo(() => datedItems(s).filter((i) => !i.done && i.date >= week.start && i.date <= week.end), [s, week.start, week.end]);

  const [formOpen, setFormOpen] = useState(false);
  const [edit, setEdit] = useState<PlannerItem | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(today);
  const [planOpen, setPlanOpen] = useState(false);
  const addRoutines = () => {
    const occ = occurrencesIn(s.routines.filter((r) => r.plannerEnabled), s.routineExceptions, week.start, week.end).filter((o) => !isOff(o));
    const n = addOccurrencesToPlanner(occ);
    toast(n ? t("rt.addedPlanner", { n }) : t("rt.nothingNew"));
  };
  const openForm = (item: PlannerItem | null, date: string | null = isThisWeek ? today : week.start) => {
    setEdit(item); setDefaultDate(date); setFormOpen(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t("pl.eyebrow")} title={isThisWeek ? t("pl.title") : week.label} subtitle={t("pl.subtitle")}>
        <div className="flex flex-wrap items-center gap-2">
          <Stepper label={week.label} onPrev={() => setAnchor(addDays(week.start, -7))} onNext={() => setAnchor(addDays(week.start, 7))}>
            {!isThisWeek && <button className="btn btn-ghost" onClick={() => setAnchor(today)}>{t("pl.thisWeek")}</button>}
          </Stepper>
          <button className="btn btn-primary" onClick={() => openForm(null)}><Plus className="h-4 w-4" />{t("pl.add")}</button>
          <button className="btn btn-soft" onClick={() => setPlanOpen(true)}>{t("pl.planWeek")}</button>
          {s.routines.some((r) => r.plannerEnabled && r.status === "ACTIVE") && <button className="btn btn-ghost" onClick={addRoutines}>{t("rt.routinesWeek")}</button>}
        </div>
      </PageHeader>

      {important.length > 0 && (
        <section className="rounded-lg bg-orange-soft/60 px-5 py-3" aria-labelledby="pl-important">
          <h2 id="pl-important" className="text-caption mb-1">{t("pl.important")}</h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {important.map((i) => <li key={i.id}><span className="font-semibold">{i.title}</span> <span className="text-muted-foreground">· {t(`type.${i.type}`)} · {formatShort(i.date)}</span></li>)}
          </ul>
        </section>
      )}

      {weekItems.length === 0 && (
        <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{t("pl.noWeek")}</span> {t("pl.noWeekBody")}</p>
      )}

      <div className="planner-week">
        {days.map((d) => {
          const items = itemsOn(s.plannerItems, d);
          const dt = fromKey(d);
          const isToday = d === today;
          return (
            <section key={d} className={`planner-day ${isToday ? "planner-day-today" : ""}`} aria-label={dt.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" })}>
              <header className="flex items-baseline justify-between gap-2 px-3 pt-3">
                <p>
                  <span className="text-caption">{dt.toLocaleDateString(locale(), { weekday: "short" })}</span>{" "}
                  <span className="font-display text-lg font-semibold">{dt.toLocaleDateString(locale(), { day: "numeric", month: "short" })}</span>
                </p>
                <button className="btn btn-ghost !p-1" onClick={() => openForm(null, d)} aria-label={`${t("pl.add")} · ${formatShort(d)}`}><Plus className="h-4 w-4" /></button>
              </header>
              <div className="px-1 pb-2">
                {items.length ? items.map((i) => <PlannerItemRow key={i.id} item={i} onEdit={(x) => openForm(x)} compact />) : <p className="px-2 py-2 text-xs text-muted-foreground">{t("pl.emptyDay")}</p>}
              </div>
            </section>
          );
        })}
      </div>

      <Inbox items={inbox} onEdit={(x) => openForm(x, null)} />

      <PlanVsReality period={week} today={today} />

      <PlannerItemForm open={formOpen} onOpenChange={setFormOpen} item={edit} defaultDate={defaultDate} today={today} />
      <PlanYourWeek open={planOpen} onOpenChange={setPlanOpen} days={days} important={important} inbox={inbox} activeGoals={s.goals.filter((g) => goalStatus(s, g) === "active").map((g) => g.title)} />
    </div>
  );
}

function Inbox({ items, onEdit }: { items: PlannerItem[]; onEdit: (i: PlannerItem) => void }) {
  const t = useT();
  const [title, setTitle] = useState("");
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (savePlannerItem({ title, date: null })) setTitle("");
  };
  return (
    <section aria-labelledby="pl-inbox">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="pl-inbox" className="text-h2">{t("pl.inbox")}</h2>
        {items.length > 0 && <span className="text-sm text-muted-foreground">{t("pl.inboxWaiting", { n: items.length })}</span>}
      </div>
      <form onSubmit={add} className="mb-3 flex gap-2">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("pl.addInbox")} aria-label={t("pl.addInbox")} />
        <button className="btn btn-soft shrink-0" type="submit">{t("pl.addInbox")}</button>
      </form>
      {items.length ? (
        <div className="surface divide-y">{items.map((i) => <PlannerItemRow key={i.id} item={i} onEdit={onEdit} />)}</div>
      ) : (
        <p className="surface px-5 py-4 text-sm"><span className="font-semibold">{t("pl.noInbox")}</span> <span className="text-muted-foreground">{t("pl.noInboxBody")}</span></p>
      )}
    </section>
  );
}

/** Manual weekly planning: shows context, the user assigns inbox items to days. Nothing is auto-scheduled. */
function PlanYourWeek({ open, onOpenChange, days, important, inbox, activeGoals }: {
  open: boolean; onOpenChange: (o: boolean) => void; days: string[]; important: { id: string; title: string; date: string }[]; inbox: PlannerItem[]; activeGoals: string[];
}) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-cream sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-h2">{t("pl.planWeek")}</DialogTitle>
          <DialogDescription>{t("pl.subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          {important.length > 0 && (
            <div><p className="text-caption mb-1">{t("pl.important")}</p>
              <ul className="space-y-0.5">{important.map((i) => <li key={i.id}>· {i.title} <span className="text-muted-foreground">({formatShort(i.date)})</span></li>)}</ul></div>
          )}
          {activeGoals.length > 0 && (
            <div><p className="text-caption mb-1">{t("pl.goals")}</p>
              <ul className="space-y-0.5">{activeGoals.map((g) => <li key={g}>· {g}</li>)}</ul></div>
          )}
          <div>
            <p className="text-caption mb-2">{t("pl.inbox")} · {t("pl.addToWeek")}</p>
            {inbox.length === 0 ? <p className="text-muted-foreground">{t("pl.noInbox")} {t("pl.noInboxBody")}</p> : (
              <ul className="space-y-2">
                {inbox.map((i) => (
                  <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <span className="truncate font-semibold">{i.title}</span>
                    <select className="field !w-36" defaultValue="" aria-label={`${i.title}: ${t("pl.pickDay")}`}
                      onChange={(e) => e.target.value && savePlannerItem({ ...i, date: e.target.value })}>
                      <option value="">{t("pl.pickDay")}</option>
                      {days.map((d) => <option key={d} value={d}>{fromKey(d).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" })}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-end"><button className="btn btn-primary" onClick={() => onOpenChange(false)}>{t("common.close")}</button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
