import { computed, ref } from "vue";
import type { Recipe, Tab, UnitSystem } from "../types/recipe";
import { buildRecipeTree, getAncestorFolderPaths } from "../lib/tree";
import { useTimers } from "../composables/useTimers";
import type { TreeFolderNode } from "../types/tree";
import type { ShoppingConfig } from "../types/shopping";
import type { MealPlanWeek, PlannedRecipeEntry } from "../types/meal-plan";
import { createRollingWeek, generateRandomWeekPlan, rebaseMealPlanWeek } from "../lib/mealPlan";
import { buildShoppingListFromPlan } from "../lib/shopping";
import type { SourceSettings } from "../types/source-settings";
import {
  DEFAULT_SOURCE_SETTINGS,
  loadSourceSettingsFromStorage,
  normalizeSourceSettings,
  saveSourceSettingsToStorage,
} from "../lib/sourceSettings";

const MEAL_PLAN_STORAGE_KEY = "cookbook.mealPlan.v1";

function getScaleFactor(servingsBase: number, servingsTarget: number): number {
  if (!servingsBase || servingsBase <= 0) return 1;
  return servingsTarget / servingsBase;
}

function safeParseStoredMealPlan(raw: string): MealPlanWeek | null {
  try {
    const parsed = JSON.parse(raw) as MealPlanWeek;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.days)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useCookbookStore() {
  const recipes = ref<Recipe[]>([]);
  const activeRecipePath = ref("");
  const tab = ref<Tab>("ingredients");
  const servingsBase = ref(1);
  const servingsTarget = ref(1);
  const unitSystem = ref<UnitSystem>("metric");
  const shoppingConfig = ref<ShoppingConfig>({ aisleByIngredient: {}, pantryByIngredient: {} });
  const expandedFolders = ref<Set<string>>(new Set());
  const mealPlanWeek = ref<MealPlanWeek>(createRollingWeek(new Date()));
  const sourceSettings = ref<SourceSettings>(DEFAULT_SOURCE_SETTINGS);

  const activeRecipeIndex = computed(() => recipes.value.findIndex((recipe) => recipe.path === activeRecipePath.value));
  const activeRecipe = computed(() => recipes.value[activeRecipeIndex.value] || null);
  const scaleFactor = computed(() => getScaleFactor(servingsBase.value, servingsTarget.value));

  const treeData = computed(() => buildRecipeTree(recipes.value));

  const timers = useTimers({
    getActiveRecipe: () => activeRecipe.value,
  });

  const activeTimers = computed(() => Object.values(timers.runningTimers));

  const plannedRecipesResolved = computed<PlannedRecipeEntry[]>(() =>
    mealPlanWeek.value.days.map((day) => ({
      day,
      recipe: recipes.value.find((recipe) => recipe.path === day.recipePath) || null,
    })),
  );

  const planShoppingCategories = computed(() =>
    buildShoppingListFromPlan(plannedRecipesResolved.value, unitSystem.value, shoppingConfig.value),
  );

  function saveMealPlanToStorage() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MEAL_PLAN_STORAGE_KEY, JSON.stringify(mealPlanWeek.value));
  }

  function initializeMealPlanWeek(today: Date) {
    mealPlanWeek.value = createRollingWeek(today);
    saveMealPlanToStorage();
  }

  function loadMealPlanFromStorage() {
    if (typeof window === "undefined") {
      mealPlanWeek.value = createRollingWeek(new Date());
      return;
    }

    const raw = window.localStorage.getItem(MEAL_PLAN_STORAGE_KEY);
    const stored = raw ? safeParseStoredMealPlan(raw) : null;
    mealPlanWeek.value = rebaseMealPlanWeek(stored, new Date());
    saveMealPlanToStorage();
  }

  function syncExpandedFolders() {
    const validPaths = new Set<string>();
    const walk = (folders: TreeFolderNode[]) => {
      for (const folder of folders) {
        validPaths.add(folder.path);
        walk(folder.folders);
      }
    };

    walk(treeData.value.root.folders);

    const next = new Set<string>();
    expandedFolders.value.forEach((path) => {
      if (validPaths.has(path)) {
        next.add(path);
      }
    });

    const active = activeRecipe.value;
    if (active) {
      getAncestorFolderPaths(active.path).forEach((path) => next.add(path));
    }

    expandedFolders.value = next;
  }

  function applyRecipes(nextRecipes: Recipe[]) {
    const previousPath = activeRecipePath.value;
    recipes.value = nextRecipes;

    const stillExists = nextRecipes.some((recipe) => recipe.path === previousPath);
    if (stillExists) {
      activeRecipePath.value = previousPath;
    } else {
      activeRecipePath.value = nextRecipes[0]?.path || "";
    }

    const validPaths = new Set(nextRecipes.map((recipe) => recipe.path));
    mealPlanWeek.value = {
      ...mealPlanWeek.value,
      days: mealPlanWeek.value.days.map((day) => {
        if (!day.recipePath || validPaths.has(day.recipePath)) return day;
        return { ...day, recipePath: null };
      }),
    };

    tab.value = "ingredients";

    const recipe = activeRecipe.value;
    servingsBase.value = recipe?.parsed.servingsBase || 1;
    servingsTarget.value = servingsBase.value;

    timers.stopAllTimers();
    syncExpandedFolders();
    saveMealPlanToStorage();
  }

  function setShoppingConfig(next: ShoppingConfig) {
    shoppingConfig.value = next;
  }

  function setPlannedRecipe(dateIso: string, recipePath: string | null) {
    const recipe = recipePath ? recipes.value.find((item) => item.path === recipePath) : null;
    mealPlanWeek.value = {
      ...mealPlanWeek.value,
      days: mealPlanWeek.value.days.map((day) => {
        if (day.dateIso !== dateIso) return day;
        return {
          ...day,
          recipePath,
          servings: recipe?.parsed.servingsBase || day.servings || 1,
        };
      }),
    };
    saveMealPlanToStorage();
  }

  function setPlannedServings(dateIso: string, servings: number) {
    const nextServings = Number.isFinite(servings) ? Math.max(1, Math.min(64, Math.round(servings))) : 1;
    mealPlanWeek.value = {
      ...mealPlanWeek.value,
      days: mealPlanWeek.value.days.map((day) => (day.dateIso === dateIso ? { ...day, servings: nextServings } : day)),
    };
    saveMealPlanToStorage();
  }

  function generateRandomWeek(opts: { overwriteFilled: boolean }) {
    mealPlanWeek.value = generateRandomWeekPlan(mealPlanWeek.value, recipes.value, opts);
    saveMealPlanToStorage();
  }

  function clearMealPlanWeek() {
    mealPlanWeek.value = {
      ...mealPlanWeek.value,
      days: mealPlanWeek.value.days.map((day) => ({ ...day, recipePath: null, servings: 1 })),
    };
    saveMealPlanToStorage();
  }

  function setSourceSettings(next: Partial<SourceSettings>) {
    const merged = normalizeSourceSettings({ ...sourceSettings.value, ...next });
    sourceSettings.value = merged;
    unitSystem.value = merged.defaultUnitSystem;
    saveSourceSettingsToStorage(merged);
  }

  function resetSourceSettings() {
    sourceSettings.value = normalizeSourceSettings(DEFAULT_SOURCE_SETTINGS);
    unitSystem.value = sourceSettings.value.defaultUnitSystem;
    saveSourceSettingsToStorage(sourceSettings.value);
  }

  function selectRecipe(path: string) {
    if (path === activeRecipePath.value) return;
    activeRecipePath.value = path;
    tab.value = "ingredients";

    const recipe = activeRecipe.value;
    servingsBase.value = recipe?.parsed.servingsBase || 1;
    servingsTarget.value = servingsBase.value;
    timers.stopAllTimers();

    getAncestorFolderPaths(path).forEach((folderPath) => {
      expandedFolders.value.add(folderPath);
    });
  }

  function toggleFolder(path: string) {
    const next = new Set(expandedFolders.value);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    expandedFolders.value = next;
  }

  function setTab(nextTab: Tab) {
    tab.value = nextTab;
  }

  function scaleDown() {
    servingsTarget.value = Math.max(1, servingsTarget.value - 1);
  }

  function scaleUp() {
    servingsTarget.value = Math.min(64, servingsTarget.value + 1);
  }

  function scaleReset() {
    servingsTarget.value = servingsBase.value || 1;
  }

  function setUnitSystem(nextSystem: UnitSystem) {
    unitSystem.value = nextSystem;
    sourceSettings.value = normalizeSourceSettings({
      ...sourceSettings.value,
      defaultUnitSystem: nextSystem,
    });
    saveSourceSettingsToStorage(sourceSettings.value);
  }

  sourceSettings.value = loadSourceSettingsFromStorage();
  unitSystem.value = sourceSettings.value.defaultUnitSystem;
  loadMealPlanFromStorage();

  return {
    recipes,
    activeRecipePath,
    activeRecipeIndex,
    activeRecipe,
    tab,
    servingsBase,
    servingsTarget,
    scaleFactor,
    unitSystem,
    shoppingConfig,
    sourceSettings,
    expandedFolders,
    treeData,
    activeTimers,
    runningTimers: timers.runningTimers,
    nowTick: timers.nowTick,
    mealPlanWeek,
    plannedRecipesResolved,
    planShoppingCategories,
    applyRecipes,
    setShoppingConfig,
    initializeMealPlanWeek,
    setPlannedRecipe,
    setPlannedServings,
    generateRandomWeek,
    clearMealPlanWeek,
    loadMealPlanFromStorage,
    saveMealPlanToStorage,
    setSourceSettings,
    resetSourceSettings,
    selectRecipe,
    toggleFolder,
    setTab,
    scaleDown,
    scaleUp,
    scaleReset,
    setUnitSystem,
    toggleTimer: timers.toggleTimer,
    addTimeToTimer: timers.addTimeToTimer,
    createCustomTimer: timers.createCustomTimer,
    isTimerRunning: timers.isTimerRunning,
    cleanupTimers: timers.cleanupTimers,
  };
}
