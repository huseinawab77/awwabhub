import { beforeEach, describe, expect, it } from "vitest";
import { getState, markOpeningSeen } from "./store";

describe("opening seen-state (3 openings per day)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // reload the module state from the now-empty storage
    window.dispatchEvent(new Event("storage"));
    location.reload();
  });

  it("lets a later slot open again on the same day", () => {
    markOpeningSeen("2026-10-09", 0);
    expect(getState().lastOpeningDate).toBe("2026-10-09");
    expect(getState().lastOpeningSlot).toBe(0);
    markOpeningSeen("2026-10-09", 1);
    expect(getState().lastOpeningSlot).toBe(1);
  });

  it("ignores re-confirming the same or an earlier slot", () => {
    markOpeningSeen("2026-10-09", 2);
    markOpeningSeen("2026-10-09", 1);
    expect(getState().lastOpeningSlot).toBe(2);
  });

  it("resets on a new day", () => {
    markOpeningSeen("2026-10-09", 2);
    markOpeningSeen("2026-10-10", 0);
    expect(getState().lastOpeningDate).toBe("2026-10-10");
    expect(getState().lastOpeningSlot).toBe(0);
  });
});
