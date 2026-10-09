import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DOMAINS, inDomain, type DomainId } from "@/lib/awwab/config";
import type { ActivityResult, Comparison } from "@/lib/awwab/calc";
import type { Insight } from "@/lib/awwab/insights";
import { actName, domainName, targetText, unitText, useT, locale, type T } from "@/lib/awwab/i18n";
import { resolveCatState } from "@/lib/branding/catStates";
import { Bar, CatIllustration, TrendChip, fmtScore } from "./ui";

export function LifeScoreBlock({ c, prevLabel }: { c: Comparison; prevLabel: string }) {
  const t = useT();
  const score = c.current.lifeScore;
  const none = score === null;
  return (
    <section className="surface-strong grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-6 sm:p-8">
      <div className="min-w-0">
        <p className="text-caption">{t("life.label")}</p>
        <p className="text-display mt-2">{none ? "0" : fmtScore(score)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {none ? (
            <span>{t("life.noData")}</span>
          ) : c.life ? (
            <>
              <TrendChip t={c.life} /> <span>{t("life.vs", { prev: prevLabel })} · {t(`trend.${c.life.dir}`)}</span>
            </>
          ) : (
            <span>{t("life.notComparable")}</span>
          )}
        </div>
        <p className="mt-3 max-w-md text-xs text-muted-foreground">
          {none ? t("life.noneBody") : c.current.dataState === "LIMITED_DATA" ? t("life.building") : t("life.basedOn", { n: c.current.recordedActivities, total: c.current.list.length })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t("life.coverage", { n: Math.round(c.current.coverage) })}</p>
        {c.current.lifeBonus > 0 && (
          <p className="mt-2 text-xs font-bold text-sage">
            {t("life.bonus", { n: c.current.lifeBonus.toLocaleString(locale()) })}
            <span className="font-normal text-muted-foreground"> · {c.current.bonusSources.map((b) => `${actName(c.current.list.find((a) => a.id === b.activityId)!, t)} +${b.points.toLocaleString(locale())}`).join(", ")}</span>
          </p>
        )}
      </div>
      <CatIllustration state={none ? "steady" : resolveCatState(score)} className="h-28 w-28 shrink-0 sm:h-36 sm:w-36" />
    </section>
  );
}

function activityDetail(r: ActivityResult, kind: string, unit: string, t: T) {
  if (r.status === "no_data") return t("detail.noData");
  const n = (x: number) => x.toLocaleString(locale());
  switch (kind) {
    case "frequency":
      return `${n(r.actual)} / ${n(r.target)} ${unitText(unit, t)}`;
    case "daily_check":
      return t("detail.daysRecorded", { a: r.actual, b: r.eligible });
    case "daily_threshold":
      return t("detail.daysOnTarget", { a: r.actual, b: r.eligible });
    case "sum":
      return `${n(r.actual)} / ${n(r.target)} ${unitText(unit, t)}`;
  }
  return "";
}

export function DomainList({ c, open: initialOpen }: { c: Comparison; open?: DomainId | null }) {
  const t = useT();
  const [open, setOpen] = useState<DomainId | null>(initialOpen ?? null);
  return (
    <ul className="divide-y overflow-hidden rounded-lg border bg-cream">
      {DOMAINS.map((d) => {
        const score = c.current.domains[d.id];
        const isOpen = open === d.id;
        return (
          <li key={d.id}>
            <button
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background sm:grid-cols-[minmax(0,1fr)_120px_auto_auto]"
              onClick={() => setOpen(isOpen ? null : d.id)}
              aria-expanded={isOpen}
            >
              <span className="truncate font-semibold">{domainName(d.id, t)}</span>
              <span className="hidden sm:block"><Bar value={score} /></span>
              <span className="flex items-center gap-2">
                <span className="hidden sm:inline">{c.domainTrends[d.id] && <TrendChip t={c.domainTrends[d.id]} />}</span>
                {score === null ? (
                  <span className="text-right text-xs text-muted-foreground">{t("common.notEnoughShort")}</span>
                ) : (
                  <span className="w-10 text-right font-display text-xl font-semibold">{fmtScore(score)}</span>
                )}
              </span>
              <ChevronDown className={`hidden h-4 w-4 text-muted-foreground transition-transform sm:block ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="bg-background/60 px-4 pb-4 pt-1">
                {score === null && <p className="py-2 text-sm text-muted-foreground">{t("common.notEnough")}</p>}
                <ul className="space-y-2">
                  {inDomain(c.current.list, d.id).map((a) => {
                    const r = c.current.activities[a.id];
                    return (
                      <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{actName(a, t)} <span className="font-normal text-muted-foreground">· {a.weight}%</span></p>
                          <p className="text-xs text-muted-foreground">{activityDetail(r, a.scoring, a.unit, t)} · {t("detail.target", { t: targetText(a, t) })}</p>
                        </div>
                        <span className="font-bold">{r.performance === null ? "—" : `${Math.round(r.performance)}%`}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Highlights({ c }: { c: Comparison }) {
  const t = useT();
  const name = (id: DomainId) => domainName(id, t);
  const items = [
    { key: "s", label: t("hl.strongest"), value: c.strongest ? `${name(c.strongest.id)} · ${fmtScore(c.strongest.score)}` : t("common.notEnoughShort") },
    { key: "a", label: t("hl.attention"), value: c.weakest ? `${name(c.weakest.id)} · ${fmtScore(c.weakest.score)}` : t("common.notEnoughShort") },
    { key: "i", label: t("hl.improve"), value: c.biggestImprovement ? `${name(c.biggestImprovement.id)} · ${t("common.pts", { n: `+${Math.round(c.biggestImprovement.diff)}` })}` : t("hl.noImprove") },
    { key: "d", label: t("hl.decline"), value: c.biggestDecline ? `${name(c.biggestDecline.id)} · ${t("common.pts", { n: Math.round(c.biggestDecline.diff) })}` : t("hl.noDecline") },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((i) => (
        <div key={i.key} className="rounded-lg bg-beige/60 px-4 py-3">
          <p className="text-caption">{i.label}</p>
          <p className="mt-1 font-semibold">{i.value}</p>
        </div>
      ))}
    </div>
  );
}

export function InsightCard({ insight, showEvidence }: { insight: Insight; showEvidence?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(!!showEvidence);
  const tone = insight.severity === "positive" ? "border-l-sage" : insight.severity === "attention" ? "border-l-rose" : "border-l-muted";
  const primary = insight.priority === "primary";
  return (
    <article className={`rounded-lg border border-l-4 bg-cream px-5 py-4 ${tone}`}>
      {primary && <p className="text-caption mb-1">{t("ins.primary")}</p>}
      <h3 className={primary ? "text-h2" : "text-h3"}>{insight.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
      {insight.evidence.length > 0 && (
        <>
          <button className="mt-2 text-xs font-bold text-rose underline-offset-2 hover:underline" onClick={() => setOpen(!open)}>
            {open ? t("ins.hide") : t("ins.show")}
          </button>
          {open && (
            <ul className="mt-2 space-y-1 text-sm">
              {insight.evidence.map((e) => (
                <li key={e} className="text-foreground/80">· {e}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}

export function WeekTrend({ data }: { data: { week: number; score: number | null }[] }) {
  const t = useT();
  const valid = data.filter((d) => d.score !== null);
  if (valid.length < 2) return <p className="text-sm text-muted-foreground">{t("trend.none")}</p>;
  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((d) => (
        <div key={d.week} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-sm font-bold">{d.score === null ? "—" : Math.round(d.score)}</span>
          <div className="flex h-24 w-full items-end rounded-md bg-beige/60">
            {d.score !== null && <div className="w-full rounded-md bg-rose" style={{ height: `${d.score}%` }} />}
          </div>
          <span className="text-xs text-muted-foreground">{t("week.n", { n: d.week })}</span>
        </div>
      ))}
    </div>
  );
}
