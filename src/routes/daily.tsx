import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { DOMAINS, activitiesAt, inDomain, type Activity } from "@/lib/awwab/config";
import { addDays, formatLong, periodFor } from "@/lib/awwab/dates";
import { actName, domainName, locale, targetText, unitText, useLang, useT } from "@/lib/awwab/i18n";
import { addQuantityLog, deleteQuantityLog, editQuantityLog, setEntry, uid, useAppState, type DailyEntry, type QuantityLog } from "@/lib/awwab/store";
import { entryLogs, logsTotal } from "@/lib/awwab/quantity";
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
      {a.inputType === "checklist" ? <CheckboxActivity a={a} date={date} entry={entry} /> : <QuantityActivity a={a} date={date} entry={entry} />}
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

function QuantityActivity({ a, date, entry }: { a: Activity; date: string; entry: DailyEntry | undefined }) {
  const t = useT();
  const state = useAppState();
  const unit = unitText(a.unit, t);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // One id per pending submission: a double click / retry re-sends the same id and is ignored.
  const pendingId = useRef<string>(uid());
  const logs = entryLogs(entry);
  const dayTotal = logsTotal(logs);
  // Weekly/monthly quantities progress against their own period target, not each day.
  const period = a.frequency === "day" ? null : periodFor(a.frequency, date);
  const total = period
    ? logsTotal(Object.entries(state.entries).filter(([d]) => d >= period.start && d <= period.end).map(([, m]) => ({ id: "", at: "", value: m[a.id]?.value ?? 0 })))
    : dayTotal;
  const pct = a.target > 0 ? Math.round((total / a.target) * 100) : 0;
  const remaining = Math.max(0, a.target - total);
  const n = (x: number) => x.toLocaleString(locale());
  const add = () => {
    const v = Number(text.trim().replace(",", "."));
    if (!text.trim() || !Number.isFinite(v) || v <= 0) return setErr(t("qty.invalid"));
    const r = addQuantityLog(date, a.id, pendingId.current, v);
    if (r === "failed") return setErr(t("qty.failed"));
    setErr(null);
    setText("");
    pendingId.current = uid();
  };
  return (
    <div className="col-span-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number" inputMode="decimal" min={0} value={text} placeholder="+0"
          onChange={(e) => { setText(e.target.value); setErr(null); }}
          onKeyDown={(e) => e.key === "Enter" && add()}
          aria-label={t("daily.inUnit", { act: actName(a, t), unit })}
          className="field !w-24 text-right font-bold"
        />
        <span className="w-12 truncate text-xs text-muted-foreground">{unit}</span>
        <button type="button" className="btn btn-primary h-9 px-3" onClick={add}><Plus className="h-4 w-4" />{t("qty.add")}</button>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${pct >= 100 ? "bg-sage" : "bg-orange"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted-foreground">
        <span><b className="text-foreground">{n(total)}</b> / {n(a.target)} {unit} · {pct}%{period ? ` · ${t("qty.thisPeriod." + a.frequency)}` : ""}</span>
        <span>{remaining > 0 ? t("qty.left", { n: n(remaining), unit }) : t("qty.reached")}</span>
      </div>
      {err && <p role="alert" className="text-xs font-bold text-rose">{err}</p>}
      {logs.length > 0 && (
        <button type="button" className="text-xs font-bold text-rose hover:underline" onClick={() => setOpen(!open)} aria-expanded={open}>
          {t("qty.history", { n: logs.length })} {period ? `· ${t("qty.today")} ${n(dayTotal)}` : ""}
        </button>
      )}
      {open && (
        <ul className="divide-y rounded-md border bg-background text-sm">
          {logs.map((l) => <LogRow key={l.id} l={l} a={a} date={date} unit={unit} onError={setErr} />)}
        </ul>
      )}
    </div>
  );
}

function LogRow({ l, a, date, unit, onError }: { l: QuantityLog; a: Activity; date: string; unit: string; onError: (s: string | null) => void }) {
  const t = useT();
  const [edit, setEdit] = useState<string | null>(null);
  const time = l.at ? new Date(l.at).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" }) : "";
  const save = () => {
    const v = Number((edit ?? "").trim().replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return onError(t("qty.invalid"));
    const r = editQuantityLog(date, a.id, l.id, v);
    if (r === "failed") return onError(t("qty.failed"));
    onError(null); setEdit(null);
  };
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <span className="w-12 text-xs text-muted-foreground">{time}</span>
      {edit === null ? (
        <span className="flex-1 font-semibold">+{l.value.toLocaleString(locale())} {unit}</span>
      ) : (
        <input type="number" inputMode="decimal" min={0} value={edit} autoFocus onChange={(e) => setEdit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} aria-label={t("qty.editValue")} className="field !h-8 flex-1 text-right" />
      )}
      {edit === null ? (
        <>
          <button type="button" className="btn btn-ghost h-8 px-2" aria-label={t("qty.edit")} onClick={() => setEdit(String(l.value))}><Pencil className="h-3.5 w-3.5" /></button>
          <button type="button" className="btn btn-ghost h-8 px-2" aria-label={t("qty.delete")} onClick={() => { if (deleteQuantityLog(date, a.id, l.id) === "failed") onError(t("qty.failed")); }}><Trash2 className="h-3.5 w-3.5" /></button>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-primary h-8 px-2" onClick={save}>{t("qty.save")}</button>
          <button type="button" className="btn btn-ghost h-8 px-2" onClick={() => setEdit(null)}>{t("qty.cancel")}</button>
        </>
      )}
    </li>
  );
}
