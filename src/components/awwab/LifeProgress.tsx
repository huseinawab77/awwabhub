import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dailyLifeScores, type DailyPoint } from "@/lib/awwab/calc";
import { formatShort } from "@/lib/awwab/dates";
import { useT } from "@/lib/awwab/i18n";
import type { Entries } from "@/lib/awwab/store";
import type { Habit } from "@/lib/awwab/config";
import { Segmented, fmtScore } from "./ui";

type Range = "7" | "30" | "90";

/** Day-by-day Life Score (rolling 7 days as of each date). Real data only; gaps before the first entry. */
export function LifeProgress({ entries, habits, today }: { entries: Entries; habits: Habit[]; today: string }) {
  const t = useT();
  const [range, setRange] = useState<Range>("30");
  // Always compute at least 8 days so "vs 7 days ago" works on the 7-day view.
  const series = useMemo(() => dailyLifeScores(Math.max(Number(range), 8), entries, today, habits), [entries, habits, today, range]);
  const shown = series.slice(-Number(range));
  const current = series[series.length - 1]?.score ?? null;
  const weekAgo = series[series.length - 8]?.score ?? null;
  const diff = current !== null && weekAgo !== null ? Math.round(current - weekAgo) : null;
  const hasAny = shown.some((p) => p.score !== null);
  const data = shown.map((p) => ({ ...p, label: formatShort(p.date) }));

  return (
    <section className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-caption">{t("progress.current")}</p>
          <p className="font-display mt-1 text-4xl font-semibold">{current === null ? "0" : fmtScore(current)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {diff === null ? t("progress.noCompare") : t("progress.vs7", { n: diff > 0 ? `+${diff}` : String(diff) })}
          </p>
        </div>
        <Segmented
          value={range}
          onChange={setRange}
          label={t("progress.title")}
          options={[{ value: "7", label: t("progress.range7") }, { value: "30", label: t("progress.range30") }, { value: "90", label: t("progress.range90") }]}
        />
      </div>
      <h2 className="text-h3 mt-6 mb-2">{t("progress.title")}</h2>
      {!hasAny ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("progress.empty")}</p>
      ) : (
        <div className="h-56 w-full" role="img" aria-label={t("progress.title")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="lifeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--rose)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--rose)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} minTickGap={24} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip cursor={{ stroke: "var(--border)" }} content={<ProgressTip />} />
              <Area type="monotone" dataKey="score" stroke="var(--rose)" strokeWidth={2.5} fill="url(#lifeFill)" connectNulls={false} dot={false} activeDot={{ r: 4, fill: "var(--rose)" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

function ProgressTip({ active, payload }: { active?: boolean; payload?: { payload: DailyPoint & { label: string } }[] }) {
  const t = useT();
  const p = active && payload?.[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-md border bg-cream px-3 py-2 text-sm shadow-sm">
      <p className="font-bold">{p.label}</p>
      <p>{t("life.label")}: {p.score === null ? t("life.noData") : fmtScore(p.score)}</p>
      {p.score !== null && !p.newData && <p className="text-xs text-muted-foreground">{t("progress.noNew")}</p>}
    </div>
  );
}
