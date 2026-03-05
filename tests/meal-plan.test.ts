import { describe, expect, it } from "vitest";
import { createRollingWeek, generateRandomWeekPlan, rebaseMealPlanWeek, toLocalDateIso } from "../src/lib/mealPlan";
import type { Recipe } from "../src/types/recipe";

function makeRecipe(path: string, servingsBase = 2): Recipe {
  return {
    name: path.split("/").pop()?.replace(/\.cook$/i, "") || path,
    path,
    content: "",
    parsed: {
      title: "",
      description: "",
      image: "",
      servingsBase,
      ingredients: [],
      tools: [],
      steps: [],
    },
  };
}

describe("meal plan helpers", () => {
  it("creates a rolling 7-day window", () => {
    const week = createRollingWeek(new Date("2026-03-05T14:00:00"));
    expect(week.days).toHaveLength(7);
    expect(week.startDateIso).toBe("2026-03-05");
    expect(week.days[0].dateIso).toBe("2026-03-05");
    expect(week.days[6].dateIso).toBe("2026-03-11");
  });

  it("rebases stale plan while preserving overlapping days", () => {
    const existing = {
      startDateIso: "2026-03-05",
      days: createRollingWeek(new Date("2026-03-05T10:00:00")).days,
    };
    existing.days[2].recipePath = "recipes/a.cook";
    existing.days[2].servings = 4;

    const rebased = rebaseMealPlanWeek(existing, new Date("2026-03-07T08:00:00"));
    expect(rebased.startDateIso).toBe("2026-03-07");
    expect(rebased.days[0].dateIso).toBe("2026-03-07");
    expect(rebased.days[0].recipePath).toBe("recipes/a.cook");
    expect(rebased.days[0].servings).toBe(4);
  });

  it("generates random week without repeats when enough recipes", () => {
    const week = createRollingWeek(new Date("2026-03-05T10:00:00"));
    const recipes = Array.from({ length: 7 }).map((_, i) => makeRecipe(`recipes/r${i}.cook`, i + 1));
    const rng = () => 0.3;

    const generated = generateRandomWeekPlan(week, recipes, { overwriteFilled: true, rng });
    const paths = generated.days.map((day) => day.recipePath).filter(Boolean);
    expect(new Set(paths).size).toBe(paths.length);
    expect(generated.days.every((day) => day.recipePath)).toBe(true);
  });

  it("leaves extra days empty when recipes are insufficient", () => {
    const week = createRollingWeek(new Date("2026-03-05T10:00:00"));
    const recipes = [makeRecipe("recipes/one.cook", 3), makeRecipe("recipes/two.cook", 2)];

    const generated = generateRandomWeekPlan(week, recipes, { overwriteFilled: true, rng: () => 0.2 });
    const filled = generated.days.filter((day) => day.recipePath);
    expect(filled).toHaveLength(2);
  });

  it("formats local date iso consistently", () => {
    expect(toLocalDateIso(new Date("2026-03-05T23:59:59"))).toBe("2026-03-05");
  });
});
