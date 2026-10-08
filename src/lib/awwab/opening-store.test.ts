import { describe, expect, it } from "vitest";
import { getState, markOpeningSeen } from "./store";

describe("opening seen-state (3 openings per day)", () => {
  it("opens again at a later slot the same day, ignores earlier slots, resets on a new day", () => {
    markOpeningSeen("2026-10-09", 0); // morning seen
    expect(getState().lastOpeningDate).toBe("2026-10-09");
    expect(getState().lastOpeningSlot).toBe(0);

    markOpeningSeen("2026-10-09", 1); // afternoon opens again
    expect(getState().lastOpeningSlot).toBe(1);

    markOpeningSeen("2026-10-09", 0); // earlier slot does not reopen
    expect(getState().lastOpeningSlot).toBe(1);

    markOpeningSeen("2026-10-09", 2); // evening opens again
    expect(getState().lastOpeningSlot).toBe(2);

    markOpeningSeen("2026-10-10", 0); // next day starts fresh
    expect(getState().lastOpeningDate).toBe("2026-10-10");
    expect(getState().lastOpeningSlot).toBe(0);
  });
});
