import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/awwab/i18n";
import type { RoutineDayDetail } from "@/lib/awwab/store";

export function RoutineDayFields({ days, details, onChange }: {
  days: number[];
  details: Partial<Record<number, RoutineDayDetail>>;
  onChange: (value: Partial<Record<number, RoutineDayDetail>>) => void;
}) {
  const t = useT();
  const [selected, setSelected] = useState(0);
  const day = days.includes(selected) ? selected : days[0];
  if (day === undefined) return null;
  const detail = details[day] ?? { title: "", description: "" };
  const update = (patch: Partial<RoutineDayDetail>) => onChange({ ...details, [day]: { ...detail, ...patch } });
  return (
    <fieldset className="space-y-3 border-t pt-4">
      <legend className="text-sm font-bold">{t("rt.f.dayDetails")}</legend>
      <div className="flex flex-wrap gap-1.5">
        {days.map((n) => <Button key={n} type="button" size="sm" variant={n === day ? "default" : "outline"} aria-pressed={n === day} onClick={() => setSelected(n)}>{t(`wd.${n}`)}</Button>)}
      </div>
      <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.dayTitle")} · {t(`wd.${day}`)}</span>
        <input className="field" value={detail.title} placeholder={t("rt.f.dayTitlePlaceholder")} onChange={(e) => update({ title: e.target.value })} /></label>
      <label className="block"><span className="mb-1 block text-sm font-bold">{t("rt.f.dayDescription")} · {t(`wd.${day}`)}</span>
        <textarea className="field min-h-28" value={detail.description} placeholder={t("rt.f.dayDescriptionPlaceholder")} onChange={(e) => update({ description: e.target.value })} /></label>
    </fieldset>
  );
}