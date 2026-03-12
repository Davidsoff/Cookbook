import { createRollingWeek, generateRandomWeekPlan, rebaseMealPlanWeek } from "../lib/mealPlan";
import type { MealPlanWeek } from "../types/meal-plan";
import type { Recipe } from "../types/recipe";
import type { SourceSettings } from "../types/source-settings";

const MEAL_PLAN_STORAGE_KEY = "cookbook.mealPlan.v1";

function safeParseStoredMealPlan(raw: string): MealPlanWeek | null {
  try {
    const parsed = JSON.parse(raw) as MealPlanWeek;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.days)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isBackendMode(settings: SourceSettings): boolean {
  return settings.mode === "backend-api";
}

function updateMealPlanDay(
  mealPlanWeek: MealPlanWeek,
  dateIso: string,
  update: (day: MealPlanWeek["days"][number]) => MealPlanWeek["days"][number],
): MealPlanWeek {
  return {
    ...mealPlanWeek,
    days: mealPlanWeek.days.map((day) => (day.dateIso === dateIso ? update(day) : day)),
  };
}

function clampServings(servings: number): number {
  return Number.isFinite(servings) ? Math.max(1, Math.min(64, Math.round(servings))) : 1;
}

export function createMealPlanWeek(today: Date): MealPlanWeek {
  return createRollingWeek(today);
}

export function loadMealPlanWeekFromStorage(sourceSettings: SourceSettings, today: Date): MealPlanWeek {
  if (typeof window === "undefined" || isBackendMode(sourceSettings)) {
    return createRollingWeek(today);
  }

  const raw = window.localStorage.getItem(MEAL_PLAN_STORAGE_KEY);
  const stored = raw ? safeParseStoredMealPlan(raw) : null;
  return rebaseMealPlanWeek(stored, today);
}

export function persistMealPlanToStorage(mealPlanWeek: MealPlanWeek, sourceSettings: SourceSettings) {
  if (typeof window === "undefined" || isBackendMode(sourceSettings)) return;
  window.localStorage.setItem(MEAL_PLAN_STORAGE_KEY, JSON.stringify(mealPlanWeek));
}

export function pruneMealPlanRecipes(mealPlanWeek: MealPlanWeek, nextRecipes: Recipe[]): MealPlanWeek {
  const validPaths = new Set(nextRecipes.map((recipe) => recipe.path));
  return {
    ...mealPlanWeek,
    days: mealPlanWeek.days.map((day) => {
      if (!day.recipePath || validPaths.has(day.recipePath)) return day;
      return { ...day, recipePath: null };
    }),
  };
}

export function rebaseStoredMealPlanWeek(mealPlanWeek: MealPlanWeek, today: Date): MealPlanWeek {
  return rebaseMealPlanWeek(mealPlanWeek, today);
}

export function setMealPlanRecipe(
  mealPlanWeek: MealPlanWeek,
  recipes: Recipe[],
  dateIso: string,
  recipePath: string | null,
): MealPlanWeek {
  const recipe = recipePath ? recipes.find((item) => item.path === recipePath) : null;
  return updateMealPlanDay(mealPlanWeek, dateIso, (day) => ({
    ...day,
    recipePath,
    servings: recipe?.parsed.servingsBase || day.servings || 1,
  }));
}

export function setMealPlanServings(mealPlanWeek: MealPlanWeek, dateIso: string, servings: number): MealPlanWeek {
  const nextServings = clampServings(servings);
  return updateMealPlanDay(mealPlanWeek, dateIso, (day) => ({ ...day, servings: nextServings }));
}

export function buildRandomMealPlanWeek(
  mealPlanWeek: MealPlanWeek,
  recipes: Recipe[],
  opts: { overwriteFilled: boolean },
): MealPlanWeek {
  return generateRandomWeekPlan(mealPlanWeek, recipes, opts);
}

export function clearMealPlanEntries(mealPlanWeek: MealPlanWeek): MealPlanWeek {
  return {
    ...mealPlanWeek,
    days: mealPlanWeek.days.map((day) => ({ ...day, recipePath: null, servings: 1 })),
  };
}
