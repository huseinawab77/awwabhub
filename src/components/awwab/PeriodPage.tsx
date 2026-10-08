import { useMemo, useState } from "react";
import { compare } from "@/lib/awwab/calc";
import { nextPeriod, periodFor, previousPeriod, type PeriodKind } from "@/lib/awwab/dates";
import { useLang, useT } from "@/lib/awwab/i18n";
import { useAppState } from "@/lib/awwab/store";
import { useToday } from "@/lib/awwab/useToday";
import { DomainList, Highlights, LifeScoreBlock } from "./Performance";
import { PageHeader, Stepper } from "./ui";
import { PlanVsReality } from "./Planner";

export function PeriodPage({ kind }: { kind: PeriodKind }) {
  const today = useToday();
  const state = useAppState();
  const t = useT();
  const lang = useLang();
  const [anchor, setAnchor] = useState(today);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const period = useMemo(() => periodFor(kind, anchor), [kind, anchor, lang]);
  const c = useMemo(() => compare(period, state.entries, today, state.habits), [state.entries, state.habits, today, period]);
  const current = period.start <= today && period.end >= today;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t(kind === "week" ? "nav.weekly" : "nav.monthly")}
        title={current ? t(`period.title.${kind}`) : period.label}
        subtitle={current ? t("period.soFar", { label: period.label }) : t(`period.sub.${kind}`)}
      >
        <Stepper
          label={period.label}
          onPrev={() => setAnchor(previousPeriod(period).start)}
          onNext={() => setAnchor(nextPeriod(period).start)}
          nextDisabled={period.end >= today}
        >
          {!current && <button className="btn btn-ghost" onClick={() => setAnchor(today)}>{t(`period.title.${kind}`)}</button>}
        </Stepper>
      </PageHeader>
      {period.start > today ? null : (
        <>
          <LifeScoreBlock c={c} prevLabel={t(`period.prev.${kind}`)} />
          <Highlights c={c} />
          <section>
            <h2 className="text-h2 mb-1">{t("sec.domainsActs")}</h2>
            <p className="mb-3 text-sm text-muted-foreground">{t("sec.domainsHint")}</p>
            <DomainList c={c} />
          </section>
          <PlanVsReality period={period} today={today} />
        </>
      )}
    </div>
  );
}
