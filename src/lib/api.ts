import type { BackendConfigDto, BackendMealPlanDto, BackendRecipesResponse, BackendShoppingPlanDto } from "../types/api";
import type { MealPlanWeek } from "../types/meal-plan";
import type { SourceSettings } from "../types/source-settings";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export function fetchBackendHealth(): Promise<{ status: string }> {
  return requestJson("/api/health");
}

export function fetchBackendConfig(): Promise<BackendConfigDto> {
  return requestJson("/api/config");
}

export function saveBackendConfig(sourceSettings: SourceSettings): Promise<BackendConfigDto> {
  return requestJson("/api/config", {
    method: "PUT",
    body: JSON.stringify({ sourceSettings }),
  });
}

export function fetchBackendRecipes(): Promise<BackendRecipesResponse> {
  return requestJson("/api/recipes");
}

export function fetchBackendMealPlan(): Promise<BackendMealPlanDto> {
  return requestJson("/api/meal-plan");
}

export function saveBackendMealPlan(mealPlan: MealPlanWeek): Promise<BackendMealPlanDto> {
  return requestJson("/api/meal-plan", {
    method: "PUT",
    body: JSON.stringify(mealPlan),
  });
}

export function fetchBackendShoppingPlan(): Promise<BackendShoppingPlanDto> {
  return requestJson("/api/shopping-plan");
}
