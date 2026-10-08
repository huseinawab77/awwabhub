import { describe, expect, it } from "vitest";
import { activitiesAt, systemHabits, versionAt, type Habit } from "@/lib/awwab/config";
import { translate } from "@/lib/awwab/i18n";

const gym = (): Habit => systemHabits().find((h) => h.id === "gym")!;

describe("habit history", () => {
  it("keeps the old target for past dates after an edit", () => {
    const h = gym();
    const v1 = h.versions[0];
    const edited: Habit = { ...h, versions: [...h.versions, { ...v1, target: v1.target + 1, effectiveFrom: "2026-10-06" }] };
    expect(versionAt(edited, "2026-09-01")?.target).toBe(v1.target);
    expect(versionAt(edited, "2026-10-07")?.target).toBe(v1.target + 1);
  });

  it("excludes archived habits only from future periods", () => {
    const h = gym();
    const archived: Habit = { ...h, versions: [...h.versions, { ...h.versions[0], active: false, effectiveFrom: "2026-10-06" }] };
    expect(activitiesAt([archived], "2026-09-01").map((a) => a.id)).toContain("gym");
    expect(activitiesAt([archived], "2026-10-10").map((a) => a.id)).not.toContain("gym");
  });
});

describe("language", () => {
  it("translates interface text and keeps IDs stable", () => {
    expect(translate("id", "nav.home")).toBe("Beranda");
    expect(translate("en", "nav.home")).toBe("Home");
    expect(translate("id", "domain.health")).toBe("Kesehatan & Kebugaran");
  });
});
