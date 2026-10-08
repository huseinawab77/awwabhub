import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { generateInsights } from "@/lib/awwab/insights";
import { periodFor, type PeriodKind } from "@/lib/awwab/dates";
import { useT } from "@/lib/awwab/i18n";
import { useAppState } from "@/lib/awwab/store";
import { meta, useToday } from "@/lib/awwab/useToday";
import { InsightCard } from "@/components/awwab/Performance";
import { PageHeader, Segmented } from "@/components/awwab/ui";

export const Route = createFileRoute("/insights")({
  head: () => meta("Insights — AWWAB", "Evidence-based explanations of what is improving and what is declining."),
  component: InsightsPage,
});

function InsightsPage() {
  const today = useToday();
  const state = useAppState();
  const t = useT();
  const [kind, setKind] = useState<PeriodKind>("week");
  const insights = useMemo(() => generateInsights(periodFor(kind, today), state.entries, today, state.habits, t), [state.entries, state.habits, today, kind, t]);
  return (
    <div>
      <PageHeader eyebrow={t("nav.insights")} title={t("ins.title")} subtitle={t("ins.subtitle")} cat="curious">
        <Segmented value={kind} onChange={setKind} options={[{ value: "week", label: t("seg.week") }, { value: "month", label: t("seg.month") }]} />
      </PageHeader>
      <div className="space-y-3">
        {insights.map((i) => <InsightCard key={i.id} insight={i} showEvidence={i.priority === "primary"} />)}
      </div>
    </div>
  );
}
