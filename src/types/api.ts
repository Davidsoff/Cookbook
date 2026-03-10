import type { MealPlanWeek } from "./meal-plan";
import type { ShoppingCategory, ShoppingConfig } from "./shopping";
import type { SourceSettings } from "./source-settings";

export interface BackendRecipeDto {
  id: string;
  path: string;
  name: string;
  content: string;
  title: string;
  description: string;
  image: string;
  servingsBase: number;
}

export interface BackendConfigDto {
  sourceSettings: SourceSettings;
  shoppingConfig: ShoppingConfig;
}

export interface BackendRecipesResponse {
  recipes: BackendRecipeDto[];
}

export interface BackendShoppingPlanDto {
  categories: ShoppingCategory[];
}

export type BackendMealPlanDto = MealPlanWeek;
