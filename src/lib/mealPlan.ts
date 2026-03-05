import type { MealPlanDay, MealPlanWeek } from "../types/meal-plan";
import type { Recipe } from "../types/recipe";

export const MEAL_PLAN_DAYS = 7;

export function toLocalDateIso(input: Date): string {
  const date = new Date(input.getFullYear(), input.getMonth(), input.getDate());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createRollingWeek(today: Date): MealPlanWeek {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days: MealPlanDay[] = [];

  for (let i = 0; i < MEAL_PLAN_DAYS; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push({
      dateIso: toLocalDateIso(date),
      recipePath: null,
      servings: 1,
    });
  }

  return {
    startDateIso: toLocalDateIso(start),
    days,
  };
}

export function rebaseMealPlanWeek(existing: MealPlanWeek | null | undefined, today: Date): MealPlanWeek {
  const next = createRollingWeek(today);
  if (!existing) return next;

  const byDate = new Map(existing.days.map((day) => [day.dateIso, day]));
  next.days = next.days.map((day) => {
    const prev = byDate.get(day.dateIso);
    if (!prev) return day;
    return {
      dateIso: day.dateIso,
      recipePath: prev.recipePath,
      servings: prev.servings > 0 ? prev.servings : 1,
    };
  });

  return next;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function generateRandomWeekPlan(
  week: MealPlanWeek,
  recipes: Recipe[],
  opts: { overwriteFilled: boolean; rng?: () => number },
): MealPlanWeek {
  const { overwriteFilled, rng = Math.random } = opts;
  const candidates = shuffle(recipes, rng);
  const nextDays = week.days.map((day) => ({ ...day }));

  const targetIndexes = nextDays
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => overwriteFilled || !day.recipePath)
    .map(({ index }) => index);

  let recipeCursor = 0;
  for (const dayIndex of targetIndexes) {
    const recipe = candidates[recipeCursor] || null;
    recipeCursor += 1;
    if (!recipe) {
      nextDays[dayIndex] = {
        ...nextDays[dayIndex],
        recipePath: null,
        servings: 1,
      };
      continue;
    }

    nextDays[dayIndex] = {
      ...nextDays[dayIndex],
      recipePath: recipe.path,
      servings: recipe.parsed.servingsBase || 1,
    };
  }

  return {
    startDateIso: week.startDateIso,
    days: nextDays,
  };
}
