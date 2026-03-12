/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { useCookbookStore } from "../src/stores/useCookbookStore";
import type { Recipe } from "../src/types/recipe";

function makeRecipe(path: string, servingsBase = 2): Recipe {
  return {
    name: path,
    path,
    content: "",
    parsed: {
      title: path,
      description: "",
      image: "",
      servingsBase,
      ingredients: [],
      tools: [],
      steps: [],
    },
  };
}

describe("meal plan store persistence", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => {
          data.set(key, value);
        },
        removeItem: (key: string) => {
          data.delete(key);
        },
        clear: () => {
          data.clear();
        },
      },
      configurable: true,
    });
  });

  it("persists planned recipe and servings", () => {
    const recipe = makeRecipe("recipes/a.cook", 3);

    const storeA = useCookbookStore();
    storeA.setSourceSettings({ mode: "local-http" });
    storeA.loadMealPlanFromStorage();
    storeA.applyRecipes([recipe]);
    const dayIso = storeA.mealPlanWeek.value.days[0].dateIso;
    storeA.setPlannedRecipe(dayIso, recipe.path);
    storeA.setPlannedServings(dayIso, 5);

    const storeB = useCookbookStore();
    storeB.setSourceSettings({ mode: "local-http" });
    storeB.loadMealPlanFromStorage();
    storeB.applyRecipes([recipe]);
    const reloaded = storeB.mealPlanWeek.value.days.find((day) => day.dateIso === dayIso);

    expect(reloaded?.recipePath).toBe(recipe.path);
    expect(reloaded?.servings).toBe(5);
  });

  it("keeps a local unit override when backend source settings are hydrated", () => {
    const store = useCookbookStore();

    store.setUnitSystem("us");
    store.hydrateSourceSettings({
      mode: "backend-api",
      githubOwner: "",
      githubRepo: "",
      githubRef: "main",
      recipesPath: "recipes/",
      aislePath: "config/aisle.conf",
      pantryPath: "config/pantry.conf",
      defaultUnitSystem: "metric",
    });

    expect(store.unitSystem.value).toBe("us");
    expect(store.sourceSettings.value.defaultUnitSystem).toBe("metric");
  });
});
