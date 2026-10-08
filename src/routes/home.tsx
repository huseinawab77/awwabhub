import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { compare, weeklyLifeScoresInMonth } from "@/lib/awwab/calc";
import { formatShort, monthKey, periodFor, type PeriodKind } from "@/lib/awwab/dates";
import { generateInsights, topInsights } from "@/lib/awwab/insights";
import { upcoming } from "@/lib/awwab/goals";
import { locale, useT } from "@/lib/awwab/i18n";
import { useAppState } from "@/lib/awwab/store";
import { meta, useToday } from "@/lib/awwab/useToday";
import { DomainList, InsightCard, LifeScoreBlock, WeekTrend } from "@/components/awwab/Performance";
import { Segmented } from "@/components/awwab/ui";
import { LifeProgress } from "@/components/awwab/LifeProgress";
import { TodayPlan } from "@/components/awwab/Planner";
import { TodaySchedule } from "@/components/awwab/Routines";

export const Route = createFileRoute("/home")({
  head: () => meta("Home — AWWAB", "How you're doing, what changed, and what to notice."),
  component: HomePage,
});

function greetingKey() {
  const h = new Date().getHours();
  return h < 11 ? "greet.morning" : h < 15 ? "greet.afternoon" : h < 19 ? "greet.evening" : "greet.night";
}

function HomePage() {
  const today = useToday();
  const state = useAppState();
  const t = useT();
  const [kind, setKind] = useState<PeriodKind>("week");
  const period = periodFor(kind, today);
  const c = useMemo(() => compare(period, state.entries, today, state.habits), [state.entries, state.habits, today, kind]);
  const insights = useMemo(() => topInsights(generateInsights(period, state.entries, today, state.habits, t)), [state.entries, state.habits, today, kind, t]);
  const monthWeeks = useMemo(() => weeklyLifeScoresInMonth(periodFor("month", today), state.entries, today, state.habits), [state.entries, state.habits, today]);
  const next = upcoming(state, today, 3);
  const review = state.reviews.find((r) => r.period === monthKey(today)) ?? [...state.reviews].sort((a, b) => b.period.localeCompare(a.period))[0];
  const hasAnyData = Object.keys(state.entries).length > 0;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption mb-2">{new Date().toLocaleDateString(locale(), { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="text-h1">{t(greetingKey())}.</h1>
          {!hasAnyData && <p className="mt-2 text-muted-foreground">{t("home.start")}</p>}
        </div>
        <Segmented value={kind} onChange={setKind} options={[{ value: "week", label: t("seg.week") }, { value: "month", label: t("seg.month") }]} />
      </header>

      <LifeScoreBlock c={c} prevLabel={t(`period.last.${kind}`)} />

      <LifeProgress entries={state.entries} habits={state.habits} today={today} />

      <TodayPlan today={today} />
      <TodaySchedule today={today} />

      {!hasAnyData && (
        <Link to="/daily" className="btn btn-primary">{t("home.openTracker")}</Link>
      )}

      <section>
        <h2 className="text-h2 mb-3">{t("home.domains")}</h2>
        <DomainList c={c} />
      </section>

      <section>
        <h2 className="text-h2 mb-3">{t("home.happening")}</h2>
        <div className="space-y-3">
          {insights.map((i) => <InsightCard key={i.id} insight={i} />)}
        </div>
        <Link to="/insights" className="mt-3 inline-block text-sm font-bold text-rose hover:underline">{t("home.allInsights")}</Link>
      </section>

      <section>
        <h2 className="text-h2 mb-3">{t("home.monthTrend")}</h2>
        <div className="surface p-5"><WeekTrend data={monthWeeks} /></div>
      </section>

      <section>
        <h2 className="text-h2 mb-3">{t("home.nextFocus")}</h2>
        <div className="surface divide-y">
          {review?.nextFocus && (
            <div className="px-5 py-3">
              <p className="text-caption">{t("home.chosenFocus")}</p>
              <p className="font-semibold">{review.nextFocus}</p>
            </div>
          )}
          {next.length ? (
            next.map((i) => (
              <div key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{t(`type.${i.type}`)}{i.parent ? ` · ${i.parent}` : ""}</p>
                </div>
                <span className="text-sm text-muted-foreground">{t("home.due", { d: formatShort(i.date) })}</span>
              </div>
            ))
          ) : (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              {t("home.nothing")} <Link to="/goals" className="font-bold text-rose hover:underline">{t("home.setGoal")}</Link>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
