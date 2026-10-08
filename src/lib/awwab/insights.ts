// Deterministic insight engine — no AI. Every insight is traceable to calculated data.
import { DOMAINS, inDomain, type DomainId, type Habit } from "./config";
import { compare, computePeriod, TREND_THRESHOLD, type PeriodResult } from "./calc";
import { previousPeriod, type Period } from "./dates";
import { actName, domainName, joinNames, targetText, type T } from "./i18n";
import type { Entries } from "./store";

export type InsightType =
  | "domain_decline"
  | "domain_improvement"
  | "activity_decline"
  | "activity_improvement"
  | "recurring_weakness"
  | "recurring_strength"
  | "strongest_domain"
  | "weakest_domain"
  | "insufficient_data";

export interface Insight {
  id: string;
  type: InsightType;
  priority: "primary" | "secondary";
  title: string;
  description: string;
  domainId?: DomainId;
  activityId?: string;
  period: string;
  evidence: string[];
  severity: "positive" | "neutral" | "attention";
}

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n)}%`);

export function generateInsights(period: Period, entries: Entries, today: string, habits: Habit[], t: T): Insight[] {
  const k = period.kind;
  const word = t(`period.this.${k}`);
  const prevWord = t(`period.last.${k}`);
  const c = compare(period, entries, today, habits);
  const cur = c.current;
  const prev = c.previous;
  const out: Omit<Insight, "priority">[] = [];
  const usedActivities = new Set<string>();
  const cfg = Object.fromEntries(cur.list.map((a) => [a.id, a]));
  const dn = (id: DomainId) => domainName(id, t);

  if (cur.lifeScore === null) {
    return [{
      id: "insufficient", type: "insufficient_data", priority: "primary", period: period.label, severity: "neutral",
      title: t("ins.none.title"),
      description: t("ins.none.desc", { period: word }),
      evidence: [],
    }];
  }

  const perf = (r: PeriodResult, id: string) => r.activities[id]?.performance ?? null;
  const activityDelta = (id: string) => {
    const a = perf(cur, id);
    const b = perf(prev, id);
    return a === null || b === null ? null : a - b;
  };

  // 1–2. Domain declines / improvements with weighted contributors
  const domainChanges = DOMAINS.map((d) => ({ d, tr: c.domainTrends[d.id] })).filter((x) => x.tr && x.tr.dir !== "stable");
  domainChanges.sort((a, b) => Math.abs(b.tr!.diff) - Math.abs(a.tr!.diff));
  for (const { d, tr } of domainChanges) {
    const down = tr!.diff < 0;
    const contributors = inDomain(cur.list, d.id)
      .map((a) => ({ a, delta: activityDelta(a.id) }))
      .filter((x) => x.delta !== null && (down ? x.delta <= -TREND_THRESHOLD : x.delta >= TREND_THRESHOLD))
      .sort((x, y) => Math.abs(y.delta!) * y.a.weight - Math.abs(x.delta!) * x.a.weight)
      .slice(0, 2);
    contributors.forEach((x) => usedActivities.add(x.a.id));
    const evidence = [
      `${dn(d.id)}: ${Math.round(prev.domains[d.id]!)} → ${Math.round(cur.domains[d.id]!)} (${tr!.diff > 0 ? "+" : ""}${Math.round(tr!.diff)})`,
      ...contributors.map((x) => `${actName(x.a, t)}: ${pct(perf(prev, x.a.id))} → ${pct(perf(cur, x.a.id))}`),
    ];
    out.push({
      id: `${down ? "dd" : "di"}-${d.id}`,
      type: down ? "domain_decline" : "domain_improvement",
      domainId: d.id,
      period: period.label,
      severity: down ? "attention" : "positive",
      title: t(down ? "ins.domainDown" : "ins.domainUp", { domain: dn(d.id), n: Math.abs(Math.round(tr!.diff)), period: word }),
      description: contributors.length
        ? t(contributors.length > 1 ? "ins.contrib.many" : "ins.contrib.one", { names: joinNames(contributors.map((x) => actName(x.a, t)), t) })
        : t("ins.compared", { prev: prevWord }),
      evidence,
    });
  }

  // 3. Lowest-performing domain with its largest weighted weakness
  if (c.weakest) {
    const id = c.weakest.id;
    const acts = inDomain(cur.list, id);
    const weak = acts
      .map((a) => ({ a, p: perf(cur, a.id) }))
      .filter((x) => x.p !== null && x.p < 100)
      .sort((x, y) => y.a.weight * (100 - y.p!) - x.a.weight * (100 - x.p!))[0];
    out.push({
      id: `wd-${id}`, type: "weakest_domain", domainId: id, period: period.label, severity: "attention",
      title: t("ins.weakest", { domain: dn(id), period: word, n: Math.round(c.weakest.score) }),
      description: weak ? t("ins.weakest.desc", { act: actName(weak.a, t), p: pct(weak.p) }) : t("ins.weakest.descNone"),
      evidence: acts.map((a) => `${actName(a, t)}: ${pct(perf(cur, a.id))} · ${t("detail.weight")} ${a.weight}%`),
    });
  }

  // 4. Recurring patterns — require 3 comparable periods with data
  const p2 = previousPeriod(previousPeriod(period));
  const results: PeriodResult[] = [cur, prev, computePeriod(p2, entries, today, habits)];
  const units = t(`ins.units.${k}`);
  const evLabels = [t(`ins.ev.ago2.${k}`, { p: "{p}" }), t(`ins.ev.ago1.${k}`, { p: "{p}" }), t("ins.ev.current", { p: "{p}" })];
  const recurring: Omit<Insight, "priority">[] = [];
  for (const id of Object.keys(cur.activities)) {
    if (usedActivities.has(id)) continue;
    const series = results.map((r) => r.activities[id]);
    if (series.some((s) => !s || s.performance === null || s.recorded < 2)) continue;
    const a = cfg[id];
    const vals = series.map((s) => s!.performance as number);
    const evidence = vals.slice().reverse().map((v, i) => evLabels[i].replace("{p}", pct(v)));
    if (vals.every((v) => v < 100)) {
      recurring.push({
        id: `rw-${id}`, type: "recurring_weakness", activityId: id, domainId: a.domain, period: period.label, severity: "attention",
        title: t("ins.recWeak", { act: actName(a, t), units }), description: t("ins.targetDesc", { target: targetText(a, t) }), evidence,
      });
    } else if (vals.every((v) => v >= 100)) {
      recurring.push({
        id: `rs-${id}`, type: "recurring_strength", activityId: id, domainId: a.domain, period: period.label, severity: "positive",
        title: t("ins.recStrong", { act: actName(a, t), units }), description: t("ins.targetDesc", { target: targetText(a, t) }), evidence,
      });
    }
  }
  recurring.sort((x, y) => cfg[y.activityId!].weight - cfg[x.activityId!].weight);
  out.push(...recurring.filter((r) => r.type === "recurring_weakness").slice(0, 2));

  // Standalone activity changes not already explained by a domain insight
  for (const id of Object.keys(cur.activities)) {
    if (usedActivities.has(id)) continue;
    const delta = activityDelta(id);
    if (delta === null || Math.abs(delta) < TREND_THRESHOLD) continue;
    const a = cfg[id];
    if (domainChanges.some((x) => x.d.id === a.domain)) continue;
    out.push({
      id: `${delta < 0 ? "ad" : "ai"}-${id}`, type: delta < 0 ? "activity_decline" : "activity_improvement", activityId: id, domainId: a.domain,
      period: period.label, severity: delta < 0 ? "attention" : "positive",
      title: t(delta < 0 ? "ins.actDown" : "ins.actUp", { act: actName(a, t), a: pct(perf(prev, id)), b: pct(perf(cur, id)) }),
      description: t("ins.compared", { prev: prevWord }),
      evidence: [`${prevWord}: ${pct(perf(prev, id))}`, `${word}: ${pct(perf(cur, id))}`],
    });
  }

  out.push(...recurring.filter((r) => r.type === "recurring_strength").slice(0, 2));

  if (c.strongest) {
    const id = c.strongest.id;
    out.push({
      id: `sd-${id}`, type: "strongest_domain", domainId: id, period: period.label, severity: "positive",
      title: t("ins.strongest", { domain: dn(id), period: word, n: Math.round(c.strongest.score) }),
      description: t("ins.strongest.desc"),
      evidence: inDomain(cur.list, id).map((a) => `${actName(a, t)}: ${pct(perf(cur, a.id))}`),
    });
  }

  const priority = ["domain_decline", "domain_improvement", "weakest_domain", "recurring_weakness", "activity_decline", "activity_improvement", "recurring_strength", "strongest_domain"];
  const seen = new Set<string>();
  const ordered = out
    .map((x, i) => ({ x, i }))
    .sort((a, b) => priority.indexOf(a.x.type) - priority.indexOf(b.x.type) || a.i - b.i)
    .map((o) => o.x)
    .filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  return ordered.map((x, i) => ({ ...x, priority: i === 0 ? "primary" : "secondary" }));
}

/** Home shows at most 1 primary + 2 secondary. */
export const topInsights = (all: Insight[]) => all.slice(0, 3);
