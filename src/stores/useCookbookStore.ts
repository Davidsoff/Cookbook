import { computed, ref } from "vue";
import type { Recipe, Tab, UnitSystem } from "../types/recipe";
import { buildRecipeTree, getAncestorFolderPaths } from "../lib/tree";
import { useTimers } from "../composables/useTimers";
import type { TreeFolderNode } from "../types/tree";
import type { ShoppingConfig } from "../types/shopping";

function getScaleFactor(servingsBase: number, servingsTarget: number): number {
  if (!servingsBase || servingsBase <= 0) return 1;
  return servingsTarget / servingsBase;
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

  const activeRecipeIndex = computed(() => recipes.value.findIndex((recipe) => recipe.path === activeRecipePath.value));
  const activeRecipe = computed(() => recipes.value[activeRecipeIndex.value] || null);
  const scaleFactor = computed(() => getScaleFactor(servingsBase.value, servingsTarget.value));

  const treeData = computed(() => buildRecipeTree(recipes.value));

  const timers = useTimers({
    getActiveRecipe: () => activeRecipe.value,
  });

  const activeTimers = computed(() => Object.values(timers.runningTimers));

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

    tab.value = "ingredients";

    const recipe = activeRecipe.value;
    servingsBase.value = recipe?.parsed.servingsBase || 1;
    servingsTarget.value = servingsBase.value;

    timers.stopAllTimers();
    syncExpandedFolders();
  }

  function setShoppingConfig(next: ShoppingConfig) {
    shoppingConfig.value = next;
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
  }

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
    expandedFolders,
    treeData,
    activeTimers,
    runningTimers: timers.runningTimers,
    nowTick: timers.nowTick,
    applyRecipes,
    setShoppingConfig,
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
