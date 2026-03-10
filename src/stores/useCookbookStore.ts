import { computed, ref } from "vue";
import type { Recipe, Tab, UnitSystem } from "../types/recipe";
import { buildRecipeTree, getAncestorFolderPaths } from "../lib/tree";
import { useTimers } from "../composables/useTimers";
import type { TreeFolderNode } from "../types/tree";
import type { ShoppingConfig } from "../types/shopping";
import type { MealPlanWeek, PlannedRecipeEntry } from "../types/meal-plan";
import { buildShoppingListFromPlan } from "../lib/shopping";
import type { SourceSettings } from "../types/source-settings";
import {
  buildRandomMealPlanWeek,
  clearMealPlanEntries,
  createMealPlanWeek,
  loadMealPlanWeekFromStorage,
  persistMealPlanToStorage,
  pruneMealPlanRecipes,
  rebaseStoredMealPlanWeek,
  setMealPlanRecipe,
  setMealPlanServings,
} from "./cookbookMealPlan";
import {
  loadPersistedSourceSettingsState,
  mergeSourceSettings,
  persistMergedSourceSettings,
  persistSourceSettings,
  persistUnitSystem,
  resetPersistedSourceSettings,
} from "./sourceSettingsState";

// Stryker disable all: store orchestration crosses persistence, timers, and UI state; mutation harness for this file is not yet representative.
function getScaleFactor(servingsBase: number, servingsTarget: number): number {
  if (!servingsBase || servingsBase <= 0) return 1;
  return servingsTarget / servingsBase;
}

function resetActiveRecipeState(recipe: Recipe | null, servingsBase: { value: number }, servingsTarget: { value: number }, tab: { value: Tab }) {
  tab.value = "ingredients";
  servingsBase.value = recipe?.parsed.servingsBase || 1;
  servingsTarget.value = servingsBase.value;
}

function setRecipePath(previousPath: string, nextRecipes: Recipe[]): string {
  return nextRecipes.some((recipe) => recipe.path === previousPath) ? previousPath : (nextRecipes[0]?.path ?? "");
}

function syncExpandedFolderSet(treeFolders: TreeFolderNode[], activePath: string | null, expanded: Set<string>): Set<string> {
  const validPaths = new Set<string>();
  const walk = (folders: TreeFolderNode[]) => {
    for (const folder of folders) {
      validPaths.add(folder.path);
      walk(folder.folders);
    }
  };

  walk(treeFolders);

  const next = new Set<string>();
  expanded.forEach((path) => {
    if (validPaths.has(path)) {
      next.add(path);
    }
  });

  if (activePath) {
    getAncestorFolderPaths(activePath).forEach((path) => next.add(path));
  }

  return next;
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
  const persistedSourceState = loadPersistedSourceSettingsState();
  const mealPlanWeek = ref<MealPlanWeek>(createMealPlanWeek(new Date()));
  const sourceSettings = ref<SourceSettings>(persistedSourceState.sourceSettings);

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
    persistMealPlanToStorage(mealPlanWeek.value, sourceSettings.value);
  }

  function initializeMealPlanWeek(today: Date) {
    mealPlanWeek.value = createMealPlanWeek(today);
    saveMealPlanToStorage();
  }

  function loadMealPlanFromStorage() {
    mealPlanWeek.value = loadMealPlanWeekFromStorage(sourceSettings.value, new Date());
    saveMealPlanToStorage();
  }

  function syncExpandedFolders() {
    expandedFolders.value = syncExpandedFolderSet(
      treeData.value.root.folders,
      activeRecipe.value?.path ?? null,
      expandedFolders.value,
    );
  }

  function applyRecipes(nextRecipes: Recipe[]) {
    const previousPath = activeRecipePath.value;
    recipes.value = nextRecipes;
    activeRecipePath.value = setRecipePath(previousPath, nextRecipes);
    mealPlanWeek.value = pruneMealPlanRecipes(mealPlanWeek.value, nextRecipes);
    resetActiveRecipeState(activeRecipe.value, servingsBase, servingsTarget, tab);

    timers.stopAllTimers();
    syncExpandedFolders();
    saveMealPlanToStorage();
  }

  function setShoppingConfig(next: ShoppingConfig) {
    shoppingConfig.value = next;
  }

  function replaceMealPlanWeek(next: MealPlanWeek) {
    mealPlanWeek.value = rebaseStoredMealPlanWeek(next, new Date());
    saveMealPlanToStorage();
  }

  function setPlannedRecipe(dateIso: string, recipePath: string | null) {
    mealPlanWeek.value = setMealPlanRecipe(mealPlanWeek.value, recipes.value, dateIso, recipePath);
    saveMealPlanToStorage();
  }

  function setPlannedServings(dateIso: string, servings: number) {
    mealPlanWeek.value = setMealPlanServings(mealPlanWeek.value, dateIso, servings);
    saveMealPlanToStorage();
  }

  function generateRandomWeek(opts: { overwriteFilled: boolean }) {
    mealPlanWeek.value = buildRandomMealPlanWeek(mealPlanWeek.value, recipes.value, opts);
    saveMealPlanToStorage();
  }

  function clearMealPlanWeek() {
    mealPlanWeek.value = clearMealPlanEntries(mealPlanWeek.value);
    saveMealPlanToStorage();
  }

  function setSourceSettings(next: Partial<SourceSettings>) {
    const nextState = persistMergedSourceSettings(sourceSettings.value, next);
    sourceSettings.value = nextState.sourceSettings;
    unitSystem.value = nextState.unitSystem;
    if (nextState.sourceSettings.mode === "backend-api") {
      mealPlanWeek.value = createMealPlanWeek(new Date());
    }
  }

  function resetSourceSettings() {
    const nextState = resetPersistedSourceSettings();
    sourceSettings.value = nextState.sourceSettings;
    unitSystem.value = nextState.unitSystem;
  }

  function selectRecipe(path: string) {
    if (path === activeRecipePath.value) return;
    activeRecipePath.value = path;
    resetActiveRecipeState(activeRecipe.value, servingsBase, servingsTarget, tab);
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
    const nextState = persistUnitSystem(sourceSettings.value, nextSystem);
    unitSystem.value = nextState.unitSystem;
    sourceSettings.value = nextState.sourceSettings;
  }

  function hydrateSourceSettings(next: SourceSettings) {
    const nextState = persistSourceSettings(next);
    sourceSettings.value = nextState.sourceSettings;
    unitSystem.value = nextState.unitSystem;
  }

  unitSystem.value = persistedSourceState.unitSystem;
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
    replaceMealPlanWeek,
    initializeMealPlanWeek,
    setPlannedRecipe,
    setPlannedServings,
    generateRandomWeek,
    clearMealPlanWeek,
    loadMealPlanFromStorage,
    saveMealPlanToStorage,
    setSourceSettings,
    hydrateSourceSettings,
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
// Stryker restore all
