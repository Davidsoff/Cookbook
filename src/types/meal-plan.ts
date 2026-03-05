import type { Recipe } from "./recipe";

export interface MealPlanDay {
  dateIso: string;
  recipePath: string | null;
  servings: number;
}

export interface MealPlanWeek {
  startDateIso: string;
  days: MealPlanDay[];
}

export interface PlannedRecipeEntry {
  day: MealPlanDay;
  recipe: Recipe | null;
}
