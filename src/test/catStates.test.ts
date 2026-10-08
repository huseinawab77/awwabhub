import { describe, expect, it } from "vitest";
import { resolveCatState } from "@/lib/branding/catStates";

describe("resolveCatState", () => {
  it.each([[0, "resting"], [39, "resting"], [40, "waking"], [59, "waking"], [60, "steady"], [74, "steady"], [75, "growing"], [89, "growing"], [90, "thriving"], [100, "thriving"]])(
    "%i → %s", (s, st) => expect(resolveCatState(s)).toBe(st),
  );
  it("changes only at boundaries", () => {
    expect([59, 60].map(resolveCatState)).toEqual(["waking", "steady"]);
    expect([74, 75].map(resolveCatState)).toEqual(["steady", "growing"]);
    expect([89, 90].map(resolveCatState)).toEqual(["growing", "thriving"]);
    expect([90, 89].map(resolveCatState)).toEqual(["thriving", "growing"]);
    expect([75, 74].map(resolveCatState)).toEqual(["growing", "steady"]);
    expect(resolveCatState(62)).toBe(resolveCatState(68));
  });
  it("defaults to steady without a score", () => expect(resolveCatState(null)).toBe("steady"));
});
