import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Minus } from "lucide-react";
import { DOMAINS, activitiesAt, inDomain, type Activity } from "@/lib/awwab/config";
import { addDays, formatLong } from "@/lib/awwab/dates";
import { actName, domainName, targetText, unitText, useLang, useT } from "@/lib/awwab/i18n";
import { setEntry, useAppState, type DailyEntry } from "@/lib/awwab/store";
import { meta, useToday } from "@/lib/awwab/useToday";
import { PageHeader, Stepper } from "@/components/awwab/ui";
import { TodayPlan } from "@/components/awwab/Planner";

export const Route = createFileRoute("/daily")({
  head: () => meta("Daily — AWWAB", "Log today's activities in under three minutes."),
  component: DailyPage,
});

function DailyPage() {
  const today = useToday();
  const t = useT();
  useLang();
  const [date, setDate] = useState(today);
  const state = useAppState();
  const day = state.entries[date] ?? {};
  const isFuture = date > today;
  const list = useMemo(() => activitiesAt(state.habits, date), [state.habits, date]);
  const filled = list.filter((a) => day[a.id]).length;
  const long = formatLong(date);
  // "Track now" from Planner lands here with #act-<id>: jump to today and focus that activity — never records anything.
  const hash = useRouterState({ select: (r) => r.location.hash });
  useEffect(() => {
    if (!hash.startsWith("act-")) return;
    setDate(today);
    const id = setTimeout(() => {
      const el = document.getElementById(hash);
      if (!el) return;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.remove("track-focus"); void el.offsetWidth; el.classList.add("track-focus");
      (el.querySelector("button, input") as HTMLElement | null)?.focus({ preventScroll: true });
    }, 50);
    return () => clearTimeout(id);
  }, [hash, today]);

  return (
    <div>
      <PageHeader eyebrow={t("nav.daily")} title={date === today ? t("daily.today") : long.split(",")[0]} subtitle={long} cat="focused">
        <Stepper label={date === today ? t("daily.today") : long.split(", ").slice(1).join(", ")} onPrev={() => setDate(addDays(date, -1))} onNext={() => setDate(addDays(date, 1))}>
          {date !== today && (
            <button className="btn btn-ghost" onClick={() => setDate(today)}>{t("daily.today")}</button>
          )}
        </Stepper>
      </PageHeader>

      {date === today && <div className="mb-8"><TodayPlan today={today} /></div>}

      {isFuture && <p className="mb-6 rounded-md bg-orange-soft px-4 py-3 text-sm">{t("daily.future")}</p>}
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <Link to="/settings" className="font-bold text-rose hover:underline">{t("daily.empty")}</Link>
        </p>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">{t("daily.hint", { n: filled, total: list.length })}</p>
      )}

      <div className="space-y-8">
        {DOMAINS.map((d) => {
          const acts = inDomain(list, d.id);
          if (!acts.length) return null;
          return (
            <section key={d.id}>
              <h2 className="text-h3 mb-2 text-muted-foreground">{domainName(d.id, t)}</h2>
              <ul className="divide-y rounded-lg border bg-cream">
                {acts.map((a) => (
                  <ActivityRow key={a.id} a={a} date={date} entry={day[a.id]} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ActivityRow({ a, date, entry }: { a: Activity; date: string; entry: DailyEntry | undefined }) {
  const t = useT();
  return (
    <li id={`act-${a.id}`} className="grid scroll-mt-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-semibold">{actName(a, t)}</p>
        <p className="text-xs text-muted-foreground">{targetText(a, t)}</p>
      </div>
      {a.inputType === "checklist" ? <CheckboxActivity a={a} date={date} entry={entry} /> : <NumericActivity a={a} date={date} entry={entry} />}
    </li>
  );
}

function CheckboxActivity({ a, date, entry }: { a: Activity; date: string; entry: DailyEntry | undefined }) {
  const t = useT();
  const v = entry?.completed ?? null;
  const next = v === null ? true : v === true ? false : null;
  const label = v === true ? t("check.done") : v === false ? t("check.notDone") : t("check.none");
  return (
    <button
      role="checkbox"
      aria-checked={v === true ? true : v === false ? false : "mixed"}
      aria-label={`${actName(a, t)}: ${label}`}
      onClick={() => setEntry(date, a.id, { completed: next })}
      className={`flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-bold transition-all ${
        v === true ? "border-sage bg-sage-soft" : v === false ? "border-rose bg-rose-soft" : "border-input bg-background text-muted-foreground"
      }`}
    >
      <span className={`grid h-5 w-5 place-items-center rounded-sm ${v === true ? "bg-sage text-cream" : v === false ? "bg-rose text-cream" : "border border-muted"}`}>
        {v === true && <Check className="h-3.5 w-3.5" />}
        {v === false && <Minus className="h-3.5 w-3.5" />}
      </span>
      <span className="hidden w-16 text-left sm:inline">{label}</span>
    </button>
  );
}

function NumericActivity({ a, date, entry }: { a: Activity; date: string; entry: DailyEntry | undefined }) {
  const t = useT();
  const stored = entry?.value ?? null;
  const [text, setText] = useState(stored === null ? "" : String(stored));
  useEffect(() => setText(stored === null ? "" : String(stored)), [stored, date]);
  const commit = () => {
    const trimmed = text.trim();
    if (trimmed === "") return setEntry(date, a.id, { value: null });
    const n = Number(trimmed);
    if (Number.isFinite(n) && n >= 0) setEntry(date, a.id, { value: n });
    else setText(stored === null ? "" : String(stored));
  };
  const hit = stored !== null && a.scoring === "daily_threshold" && stored >= a.target;
  const unit = unitText(a.unit, t);
  return (
    <label className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={text}
        placeholder="—"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
        aria-label={t("daily.inUnit", { act: actName(a, t), unit })}
        className={`field !w-24 text-right font-bold ${hit ? "!border-sage" : ""}`}
      />
      <span className="w-12 truncate text-xs text-muted-foreground">{unit}</span>
    </label>
  );
}
