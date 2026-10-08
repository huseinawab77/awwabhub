import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AwwabCat } from "@/components/branding/AwwabCat";
import type { CatState } from "@/lib/branding/catStates";
import type { TrendDir } from "@/lib/awwab/calc";
import { setLang, useLang, useT } from "@/lib/awwab/i18n";

// Legacy moods map onto the shared cat poses.
const CATS: Record<"resting" | "focused" | "curious", CatState> = { resting: "resting", focused: "steady", curious: "waking" };

export function CatIllustration({ mood, state, className = "", alt }: { mood?: keyof typeof CATS; state?: CatState; className?: string; alt?: string }) {
  const t = useT();
  return <AwwabCat state={state ?? CATS[mood ?? "focused"]} size={96} title={alt ?? t("cat.alt")} className={`select-none ${className}`} />;
}

export function PageHeader({ eyebrow, title, subtitle, cat, children }: { eyebrow?: string; title: string; subtitle?: string; cat?: keyof typeof CATS; children?: ReactNode }) {
  return (
    <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-caption mb-2">{eyebrow}</p>}
        <h1 className="text-h1">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
      {cat && <CatIllustration mood={cat} className="h-24 w-24 shrink-0 sm:h-32 sm:w-32" />}
    </header>
  );
}

export function EmptyState({ title, body, cat = "resting", action }: { title: string; body: string; cat?: keyof typeof CATS; action?: ReactNode }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-10 text-center">
      <CatIllustration mood={cat} className="mb-4 h-28 w-28" />
      <h3 className="text-h3">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function TrendChip({ t: tr, suffix }: { t: { diff: number; dir: TrendDir } | null; suffix?: string }) {
  const t = useT();
  if (!tr) return null;
  const cls = tr.dir === "improving" ? "chip-up" : tr.dir === "declining" ? "chip-down" : "chip-flat";
  const arrow = tr.dir === "improving" ? "↑" : tr.dir === "declining" ? "↓" : "→";
  const n = Math.round(tr.diff);
  return (
    <span className={`chip ${cls}`}>
      {arrow} {t("common.pts", { n: `${n > 0 ? "+" : ""}${n}` })}{suffix ? ` ${suffix}` : ""}
    </span>
  );
}

export function Bar({ value }: { value: number | null }) {
  return (
    <div className="bar" role="progressbar" aria-valuenow={value ?? undefined} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${value ?? 0}%` }} />
    </div>
  );
}

export function Stepper({ label, onPrev, onNext, nextDisabled, children }: { label: string; onPrev: () => void; onNext: () => void; nextDisabled?: boolean; children?: ReactNode }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn btn-soft !px-2" onClick={onPrev} aria-label={t("common.prev")}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[9rem] text-center text-sm font-bold">{label}</span>
      <button className="btn btn-soft !px-2 disabled:opacity-40" onClick={onNext} disabled={nextDisabled} aria-label={t("common.next")}>
        <ChevronRight className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="inline-flex rounded-md bg-beige p-1" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-sm px-3 py-1 text-sm font-bold transition-colors ${value === o.value ? "bg-cream text-foreground shadow-soft" : "text-muted-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Subtle ID | EN switcher. */
export function LangSwitch() {
  const lang = useLang();
  const t = useT();
  return (
    <Segmented
      value={lang}
      onChange={setLang}
      label={t("settings.language")}
      options={[{ value: "id", label: "ID" }, { value: "en", label: "EN" }]}
    />
  );
}

export const fmtScore = (n: number | null) => (n === null ? "—" : String(Math.round(n)));
