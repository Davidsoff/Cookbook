import { afterEach, describe, expect, it, vi } from "vitest";
import { formatClock, getRemainingTimerSeconds } from "../src/lib/time";

describe("time helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats elapsed seconds as a clock string", () => {
    expect(formatClock(125)).toBe("2:05");
    expect(formatClock(-1)).toBe("0:00");
  });

  it("rounds up remaining timer seconds and floors missing timers to zero", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));

    expect(getRemainingTimerSeconds(undefined)).toBe(0);
    expect(
      getRemainingTimerSeconds({
        id: "timer-1",
        label: "Rest",
        endsAt: Date.now() + 1500,
        intervalId: 0,
        timeoutId: 0,
      }),
    ).toBe(2);
  });
});
