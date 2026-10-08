import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { compare } from "@/lib/awwab/calc";
import { DOMAIN_BY_ID, type DomainId } from "@/lib/awwab/config";
import { addDays, formatShort, monthKey, periodFor, previousPeriod } from "@/lib/awwab/dates";
import { goalProgress, goalStatus, isOverdue, milestonesOf, projectStatus, projectsOf } from "@/lib/awwab/goals";
import { saveReview, useAppState } from "@/lib/awwab/store";
import { meta, useToday } from "@/lib/awwab/useToday";
import { domainName, useLang, useT } from "@/lib/awwab/i18n";
import { TrendChip, fmtScore, PageHeader, Stepper } from "@/components/awwab/ui";
import { PlanVsReality } from "@/components/awwab/Planner";

export const Route = createFileRoute("/review")({
  head: () => meta("Monthly Review — AWWAB", "Look back, understand, reflect and choose your next focus."),
  component: ReviewPage,
});

const PROMPTS = ["wentWell", "difficult", "change", "stop", "continue"] as const;
type PromptKey = (typeof PROMPTS)[number];

function ReviewPage() {
  const today = useToday();
  const t = useT();
  useLang();
  const state = useAppState();
  const [anchor, setAnchor] = useState(today);
  const month = periodFor("month", anchor);
  const key = monthKey(month.start);
  const c = useMemo(() => compare(month, state.entries, today), [state.entries, today, month.start]);
  const name = (id: DomainId | undefined) => (id && DOMAIN_BY_ID[id] ? domainName(id, t) : null);
  const existing = state.reviews.find((r) => r.period === key);
  const prevReview = state.reviews.find((r) => r.period === monthKey(previousPeriod(month).start));

  const [form, setForm] = useState<Record<PromptKey | "nextFocus", string>>({ wentWell: "", difficult: "", change: "", stop: "", continue: "", nextFocus: "" });
  const [saved, setSaved] = useState<"idle" | "saved">("idle");
  useEffect(() => {
    setForm({
      wentWell: existing?.wentWell ?? "", difficult: existing?.difficult ?? "", change: existing?.change ?? "",
      stop: existing?.stop ?? "", continue: existing?.continue ?? "", nextFocus: existing?.nextFocus ?? "",
    });
    setSaved("idle");
  }, [key, existing?.id]);

  const inMonth = (d: string | null) => !!d && d >= month.start && d <= month.end;
  const completedMs = state.milestones.filter((m) => m.status === "completed" && m.completedAt && inMonth(m.completedAt.slice(0, 10)));
  const completedProjects = state.projects.filter((p) => projectStatus(state, p) === "completed" && milestonesOf(state, p.id).some((m) => inMonth(m.completedAt?.slice(0, 10) ?? null)));
  const overdue = state.milestones.filter((m) => isOverdue(m.dueDate, m.status === "completed", today));
  const nearDeadline = state.projects.filter((p) => p.targetDate && projectStatus(state, p) !== "completed" && p.status !== "archived" && p.targetDate >= today && p.targetDate <= addDays(today, 14));
  const goals = state.goals.filter((g) => goalStatus(state, g) !== "archived");

  const save = () => {
    saveReview({
      period: key,
      snapshot: {
        lifeScore: c.current.lifeScore,
        strongestDomain: name(c.strongest?.id),
        needsAttention: name(c.weakest?.id),
        biggestImprovement: name(c.biggestImprovement?.id),
        biggestDecline: name(c.biggestDecline?.id),
        goalProgress: Object.fromEntries(goals.map((g) => [g.id, goalProgress(state, g)])),
      },
      ...form,
    });
    setSaved("saved");
  };

  const pastReviews = [...state.reviews].sort((a, b) => b.period.localeCompare(a.period));

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={t("review.eyebrow")} title={month.label} subtitle={t("review.subtitle")} cat="resting">
        <Stepper label={month.label} onPrev={() => setAnchor(previousPeriod(month).start)} onNext={() => setAnchor(addDays(month.end, 1))} nextDisabled={month.end >= today} />
      </PageHeader>

      <section className="surface-strong grid gap-6 p-6 sm:grid-cols-3">
        <div>
          <p className="text-caption">{t("life.label")}</p>
          <p className="text-display mt-1 !text-6xl">{c.current.lifeScore === null ? "0" : fmtScore(c.current.lifeScore)}</p>
          {c.current.lifeScore === null && <p className="text-sm text-muted-foreground">{t("common.notEnough")}</p>}
        </div>
        <div>
          <p className="text-caption">{t("review.prevMonth")}</p>
          <p className="font-display mt-1 text-3xl font-semibold">{fmtScore(c.previous.lifeScore)}</p>
          <div className="mt-2">{c.life ? <TrendChip t={c.life} /> : <span className="text-sm text-muted-foreground">{t("review.noCompare")}</span>}</div>
        </div>
        <div className="space-y-2 text-sm">
          <p><span className="text-caption block">{t("review.strongest")}</span>{name(c.strongest?.id) ?? t("common.notEnoughShort")}</p>
          <p><span className="text-caption block">{t("hl.attention")}</span>{name(c.weakest?.id) ?? t("common.notEnoughShort")}</p>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="text-h2 mb-3">{t("review.wentWell")}</h2>
          <ul className="space-y-2 text-sm">
            {c.strongest && <li>· {t("review.strongestArea")} <b>{name(c.strongest.id)}</b> ({fmtScore(c.strongest.score)})</li>}
            {c.biggestImprovement && <li>· {t("review.improved", { d: name(c.biggestImprovement.id) ?? "", n: Math.round(c.biggestImprovement.diff) })}</li>}
            {completedProjects.map((p) => <li key={p.id}>· {t("review.completedProject")} <b>{p.title}</b></li>)}
            {completedMs.length > 0 && <li>· {t("review.msCompleted", { n: completedMs.length })}</li>}
            {!c.strongest && !c.biggestImprovement && !completedProjects.length && !completedMs.length && <li className="text-muted-foreground">{t("review.nothing")}</li>}
          </ul>
        </section>
        <section>
          <h2 className="text-h2 mb-3">{t("hl.attention")}</h2>
          <ul className="space-y-2 text-sm">
            {c.biggestDecline && <li>· {t("review.declined", { d: name(c.biggestDecline.id) ?? "", n: Math.round(c.biggestDecline.diff) })}</li>}
            {c.weakest && <li>· {t("review.lowest")} <b>{name(c.weakest.id)}</b> ({fmtScore(c.weakest.score)})</li>}
            {overdue.map((m) => <li key={m.id}>· {t("review.overdueMs", { t: m.title, d: formatShort(m.dueDate!) })}</li>)}
            {nearDeadline.map((p) => <li key={p.id}>· {t("review.dueSoon", { t: p.title, d: formatShort(p.targetDate!) })}</li>)}
            {!c.biggestDecline && !c.weakest && !overdue.length && !nearDeadline.length && <li className="text-muted-foreground">{t("review.nothingFlagged")}</li>}
          </ul>
        </section>
      </div>

      <PlanVsReality period={month} today={today} />


      <section>
        <h2 className="text-h2 mb-3">{t("review.goals")}</h2>
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("review.noGoals")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-cream">
            <table className="w-full text-sm">
              <thead className="text-caption text-left">
                <tr><th className="px-4 py-2">{t("col.goal")}</th><th className="px-4 py-2">{t("col.prev")}</th><th className="px-4 py-2">{t("col.cur")}</th><th className="px-4 py-2">{t("col.nextMs")}</th></tr>
              </thead>
              <tbody className="divide-y">
                {goals.map((g) => {
                  const cur = goalProgress(state, g);
                  const prev = prevReview?.snapshot.goalProgress[g.id];
                  const nextMs = projectsOf(state, g.id).flatMap((p) => milestonesOf(state, p.id)).filter((m) => m.status !== "completed").sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))[0];
                  return (
                    <tr key={g.id}>
                      <td className="px-4 py-2 font-semibold">{g.title}</td>
                      <td className="px-4 py-2">{prev === undefined || prev === null ? "—" : `${prev}%`}</td>
                      <td className="px-4 py-2">{cur === null ? "—" : `${cur}%`}{cur !== null && typeof prev === "number" && <span className="ml-1 text-muted-foreground">({cur - prev >= 0 ? "+" : ""}{cur - prev})</span>}</td>
                      <td className="px-4 py-2 text-muted-foreground">{nextMs ? `${nextMs.title}${nextMs.dueDate ? ` · ${formatShort(nextMs.dueDate)}` : ""}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-h2 mb-3">{t("review.reflection")}</h2>
        <div className="space-y-4">
          {PROMPTS.map((p) => (
            <label key={p} className="block">
              <span className="mb-1 block text-sm font-bold">{t(`review.q.${p}`)}</span>
              <textarea className="field" rows={3} value={form[p]} onChange={(e) => { setForm({ ...form, [p]: e.target.value }); setSaved("idle"); }} />
            </label>
          ))}
          <label className="block">
            <span className="mb-1 block text-sm font-bold">{t("review.focus")}</span>
            <input className="field" placeholder={t("review.focusPh")} value={form.nextFocus} onChange={(e) => { setForm({ ...form, nextFocus: e.target.value }); setSaved("idle"); }} />
          </label>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={save}>{existing ? t("review.update") : t("review.save")}</button>
            {saved === "saved" && <span className="text-sm text-muted-foreground">{t("common.saved")}</span>}
          </div>
        </div>
      </section>

      {pastReviews.length > 0 && (
        <section>
          <h2 className="text-h2 mb-3">{t("review.past")}</h2>
          <ul className="flex flex-wrap gap-2">
            {pastReviews.map((r) => (
              <li key={r.id}>
                <button className={`btn ${r.period === key ? "btn-primary" : "btn-soft"}`} onClick={() => setAnchor(`${r.period}-01`)}>
                  {periodFor("month", `${r.period}-01`).label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
