/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTimers } from "../src/composables/useTimers";
import type { Recipe } from "../src/types/recipe";

function makeRecipe(): Recipe {
  return {
    name: "Tea",
    path: "recipes/tea.cook",
    content: "",
    parsed: {
      title: "Tea",
      description: "",
      image: "",
      servingsBase: 1,
      ingredients: [],
      tools: [],
      steps: [
        {
          kind: "instruction",
          text: "Steep",
          timers: [{ id: "timer-1", label: "Steep", quantityRaw: "5 min", displayQuantity: "5 min", seconds: 300 }],
        },
      ],
    },
  };
}

describe("useTimers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("starts, extends, and stops recipe timers", () => {
    const recipe = makeRecipe();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const timers = useTimers({ getActiveRecipe: () => recipe });

    timers.toggleTimer("timer-1");
    expect(timers.isTimerRunning("timer-1")).toBe(true);

    timers.addTimeToTimer("timer-1", 60);
    expect(timers.runningTimers["timer-1"].endsAt).toBe(Date.now() + 360000);

    vi.advanceTimersByTime(360000);
    expect(alertSpy).toHaveBeenCalledWith("Timer done: Steep (5 min)");
    expect(timers.isTimerRunning("timer-1")).toBe(false);
  });

  it("creates and cleans up custom timers", () => {
    const timers = useTimers({ getActiveRecipe: () => null });

    timers.createCustomTimer(2, "Boil");
    expect(Object.keys(timers.runningTimers)).toEqual(["custom-timer-0"]);

    timers.cleanupTimers();
    expect(Object.keys(timers.runningTimers)).toEqual([]);
  });
});
