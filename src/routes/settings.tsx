import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { DOMAINS, LABEL_TARGETS, inDomain, activitiesAt, latestVersion, weightIssues, type DomainId, type Frequency, type Habit, type InputType } from "@/lib/awwab/config";
import { formatShort } from "@/lib/awwab/dates";
import { actName, domainName, targetText, useT } from "@/lib/awwab/i18n";
import { archiveHabit, createHabit, deleteHabit, habitHasHistory, reactivateHabit, rebalanceDomain, updateHabit, useAppState } from "@/lib/awwab/store";
import { meta, useToday } from "@/lib/awwab/useToday";
import { LangSwitch, PageHeader } from "@/components/awwab/ui";
import { AccountCard } from "@/components/awwab/Account";

export const Route = createFileRoute("/settings")({
  head: () => meta("Settings — AWWAB", "Language and the habits you track."),
  component: SettingsPage,
});

function SettingsPage() {
  const t = useT();
  const today = useToday();
  const state = useAppState();
  const [adding, setAdding] = useState(false);
  const active = useMemo(() => activitiesAt(state.habits, today), [state.habits, today]);
  const byId = Object.fromEntries(state.habits.map((h) => [h.id, h]));
  const archived = state.habits.filter((h) => !latestVersion(h).active);
  const issues = weightIssues(active);

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={t("nav.settings")} title={t("nav.settings")} subtitle={t("settings.subtitle")} />
      <AccountCard />
      <section className="surface p-5">
        <h2 className="text-h3">{t("settings.language")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("settings.langHint")}</p>
        <LangSwitch />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h2">{t("habits.title")}</h2>
          <button className="btn btn-primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> {t("habits.add")}</button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t("habits.historyNote")}</p>
        {adding && <HabitForm onDone={() => setAdding(false)} />}
        {issues.map((w) => (
          <div key={w.domain} className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-orange-soft px-4 py-3 text-sm">
            <span>{t("habits.weightWarn", { domain: domainName(w.domain, t), n: w.total })}</span>
            <button className="btn btn-soft !py-1" onClick={() => rebalanceDomain(w.domain, today)}>{t("habits.rebalance")}</button>
          </div>
        ))}
        <div className="space-y-6">
          {DOMAINS.map((d) => {
            const acts = inDomain(active, d.id);
            if (!acts.length) return null;
            return (
              <div key={d.id}>
                <h3 className="text-h3 mb-2 text-muted-foreground">{domainName(d.id, t)}</h3>
                <ul className="divide-y rounded-lg border bg-cream">
                  {acts.map((a) => <HabitRow key={a.id} habit={byId[a.id]} label={`${targetText(a, t)} · ${t(`input.${a.inputType}`)} · ${a.weight}%`} name={actName(a, t)} />)}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-h2 mb-3">{t("habits.archived")}</h2>
        {archived.length === 0 ? <p className="text-sm text-muted-foreground">{t("habits.noArchived")}</p> : (
          <ul className="divide-y rounded-lg border bg-cream">
            {archived.map((h) => (
              <li key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{actName(h, t)}</p>
                  {h.archivedAt && <p className="text-xs text-muted-foreground">{t("habits.archivedOn", { d: formatShort(h.archivedAt.slice(0, 10)) })}</p>}
                </div>
                <button className="btn btn-soft" onClick={() => reactivateHabit(h.id, today)}>{t("habits.reactivate")}</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HabitRow({ habit, name, label }: { habit: Habit; name: string; label: string }) {
  const t = useT();
  const today = useToday();
  const state = useAppState();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (editing) return <li className="p-3"><HabitForm habit={habit} onDone={() => setEditing(false)} /></li>;
  const history = habitHasHistory(state, habit.id);
  const remove = () => {
    if (history) setConfirm(true);
    else if (window.confirm(t("habits.confirmDelete"))) deleteHabit(habit.id);
  };
  return (
    <li className="px-4 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}{!habit.isSystem && <span className="chip chip-flat ml-2">{t("habits.custom")}</span>}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-ghost !py-1 text-sm" onClick={() => setEditing(true)}>{t("habits.edit")}</button>
          <button className="btn btn-ghost !py-1 text-sm" onClick={remove}>{t("habits.delete")}</button>
        </div>
      </div>
      {confirm && (
        <div className="mt-2 rounded-md bg-orange-soft p-3 text-sm">
          {history && <p className="mb-2">{t("habits.historyWarn")}</p>}
          <div className="flex gap-2">
            <button className="btn btn-ghost !py-1" onClick={() => setConfirm(false)}>{t("common.cancel")}</button>
            <button className="btn btn-primary !py-1" onClick={() => { archiveHabit(habit.id, today); setConfirm(false); }}>{t("habits.archiveShort")}</button>
            <button className="btn btn-ghost !py-1 text-destructive" onClick={() => { deleteHabit(habit.id, true); setConfirm(false); }}>{t("habits.delete")}</button>
          </div>
        </div>
      )}
    </li>
  );
}

function HabitForm({ habit, onDone }: { habit?: Habit; onDone: () => void }) {
  const t = useT();
  const today = useToday();
  const state = useAppState();
  const v = habit ? latestVersion(habit) : null;
  const initialName = habit ? actName(habit, t) : "";
  const [name, setName] = useState(initialName);
  const [domain, setDomain] = useState<DomainId>(v?.domain ?? "health");
  const label = habit?.isSystem && v?.inputType === "checklist" && v.frequency === "day" ? LABEL_TARGETS[habit.id] : undefined;
  const [inputType, setInputType] = useState<InputType>(label ? "quantitative" : (v?.inputType ?? "checklist"));
  const [target, setTarget] = useState(String(label?.target ?? v?.target ?? 1));
  const [unit, setUnit] = useState(label?.unit ?? (v?.unit === "day" ? "" : (v?.unit ?? "")));
  const [frequency, setFrequency] = useState<Frequency>(v?.frequency ?? "day");
  const [weight, setWeight] = useState(String(v?.weight ?? 10));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const checkDaily = inputType === "checklist" && frequency === "day" && Number(target) <= 1;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const tn = Number(target);
    const wn = Number(weight);
    if (!name.trim()) return setError(t("habits.err.name"));
    if (!Number.isFinite(tn) || tn <= 0) return setError(t("habits.err.target"));
    if (!Number.isFinite(wn) || wn < 0 || wn > 100) return setError(t("habits.err.weight"));
    const dup = activitiesAt(state.habits, today).some((a) => a.id !== habit?.id && a.domain === domain && actName(a, t).toLowerCase() === name.trim().toLowerCase());
    if (dup) return setError(t("habits.err.dup"));
    setBusy(true);
    const cfg = { domain, inputType, target: tn, unit: unit.trim() || (inputType === "checklist" ? "times" : ""), frequency, weight: wn };
    if (habit) updateHabit(habit.id, name.trim() === initialName && habit.isSystem && !habit.customName ? null : name.trim(), cfg, today);
    else createHabit({ name, ...cfg }, today);
    onDone();
  };

  return (
    <form onSubmit={submit} className="surface mb-4 grid gap-3 p-5 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className="mb-1 block text-sm font-bold">{t("habits.name")}</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
      <label><span className="mb-1 block text-sm font-bold">{t("goals.domain")}</span>
        <select className="field" value={domain} onChange={(e) => setDomain(e.target.value as DomainId)}>
          {DOMAINS.map((d) => <option key={d.id} value={d.id}>{domainName(d.id, t)}</option>)}
        </select></label>
      <label><span className="mb-1 block text-sm font-bold">{t("habits.inputType")}</span>
        <select className="field" value={inputType} onChange={(e) => setInputType(e.target.value as InputType)}>
          <option value="checklist">{t("input.checklist")}</option>
          <option value="quantitative">{t("input.quantitative")}</option>
        </select></label>
      <label><span className="mb-1 block text-sm font-bold">{t("habits.frequency")}</span>
        <select className="field" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
          <option value="day">{t("freq.day")}</option><option value="week">{t("freq.week")}</option><option value="month">{t("freq.month")}</option>
        </select></label>
      <label><span className="mb-1 block text-sm font-bold">{t("habits.target")}</span>
        <input className="field" type="number" min={0} step="any" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
      {(inputType === "quantitative" || !checkDaily) && (
        <label><span className="mb-1 block text-sm font-bold">{t("habits.unit")}</span>
          <input className="field" placeholder={t("habits.unitPh")} value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
      )}
      <label><span className="mb-1 block text-sm font-bold">{t("habits.weight")}</span>
        <input className="field" type="number" min={0} max={100} step="any" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
      {checkDaily && <p className="text-xs text-muted-foreground sm:col-span-2">{t("habits.checkHint")}</p>}
      {error && <p className="text-sm font-bold text-destructive sm:col-span-2" role="alert">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn btn-primary" type="submit" disabled={busy}>{t("habits.save")}</button>
        <button className="btn btn-ghost" type="button" onClick={onDone}>{t("common.cancel")}</button>
      </div>
    </form>
  );
}
