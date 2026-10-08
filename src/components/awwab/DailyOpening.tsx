import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { ExternalLink } from "lucide-react";
import { AwwabCat } from "@/components/branding/AwwabCat";
import { useLang, useT } from "@/lib/awwab/i18n";
import { greetingPart, reminderFor } from "@/lib/awwab/reminders";
import { markOpeningSeen } from "@/lib/awwab/store";
import { fromKey } from "@/lib/awwab/dates";

/** Once-per-day grounding screen. Only writes lastOpeningDate; never touches tracking or scores. */
export function DailyOpening({ user, today }: { user: User; today: string }) {
  const t = useT();
  const lang = useLang();
  const navigate = useNavigate();
  const r = reminderFor(today);
  const rawName = user.user_metadata?.["display_name"] ?? user.user_metadata?.["full_name"] ?? user.user_metadata?.["name"];
  const name = typeof rawName === "string" && rawName.trim() ? rawName.trim().split(/\s+/)[0] : "";
  const hello = t(`op.${greetingPart(new Date().getHours())}`) + (name ? `, ${name}` : "") + ".";
  const date = fromKey(today).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const begin = () => {
    markOpeningSeen(today);
    navigate({ to: "/home", replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-5 py-10">
      <article className="animate-in fade-in slide-in-from-bottom-2 w-full max-w-xl text-center duration-700 motion-reduce:animate-none">
        <AwwabCat state="waking" size={112} className="mx-auto" title={t("cat.alt")} />
        <p className="text-caption mt-4">{date}</p>
        <h1 className="text-h1 mt-2">{hello}</h1>

        {r ? (
          <section className="mt-8 rounded-2xl border bg-background/60 p-6 text-left sm:p-8" aria-label={r.reference}>
            <p className="text-caption">{r.type === "quran" ? t("op.quran") : `${t("op.hadith")} · ${t("op.summary")}`} · {lang === "id" ? r.themeId : r.themeEn}</p>
            {r.arabicText && (
              <p lang="ar" dir="rtl" className="mt-4 text-right font-serif text-2xl leading-loose">{r.arabicText}</p>
            )}
            <blockquote className="font-display mt-4 text-lg leading-relaxed">
              “{lang === "id" ? r.translationId : r.translationEn}”
            </blockquote>
            <p className="mt-4 text-sm font-semibold">
              <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                {r.reference} <ExternalLink className="h-3.5 w-3.5" aria-label={t("op.openSource")} />
              </a>
            </p>
            {r.type === "quran" && <p className="text-xs text-muted-foreground">{lang === "id" ? t("op.trId") : t("op.trEn")}</p>}
            <div className="mt-6 border-t pt-4">
              <p className="text-caption">{t("op.reflection")}</p>
              <p className="mt-1 text-muted-foreground">{lang === "id" ? r.reflectionId : r.reflectionEn}</p>
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-2xl border bg-background/60 p-6">
            <p className="text-caption">AWWAB</p>
            <p className="font-display mt-2 text-lg">{t("op.fbTitle")}</p>
            <p className="mt-1 text-muted-foreground">{t("op.fbBody")}</p>
          </section>
        )}

        <button type="button" onClick={begin} autoFocus className="btn btn-primary mt-8 w-full sm:w-auto sm:px-10">
          {t("op.start")}
        </button>
      </article>
    </main>
  );
}
