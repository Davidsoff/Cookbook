<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, reactive, ref, watch } from "vue";
import TopBar from "./components/TopBar.vue";
import RecipeTree from "./components/RecipeTree.vue";
import RecipeHero from "./components/RecipeHero.vue";
import TabsBar from "./components/TabsBar.vue";
import IngredientsPanel from "./components/IngredientsPanel.vue";
import StepsPanel from "./components/StepsPanel.vue";
import ToolsPanel from "./components/ToolsPanel.vue";
import MealPlanPanel from "./components/MealPlanPanel.vue";
import PlanShoppingPanel from "./components/PlanShoppingPanel.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import { useCookbookStore } from "./stores/useCookbookStore";
import { useRecipesSource } from "./composables/useRecipesSource";
import { cookbookUiContextKey } from "./lib/cookbookUiContext";
import type { SourceSettings } from "./types/source-settings";
import { fetchBackendMealPlan, saveBackendConfig, saveBackendMealPlan } from "./lib/api";

const store = reactive(useCookbookStore());
const backendAvailable = ref(true);
const backendMessage = ref("");

const source = useRecipesSource({
  getSettings: () => store.sourceSettings,
  onData: ({ recipes, shoppingConfig, sourceSettings }) => {
    store.hydrateSourceSettings(sourceSettings);
    store.applyRecipes(recipes);
    store.setShoppingConfig(shoppingConfig);
  },
  onStatus: ({ backendAvailable: nextAvailable, message }) => {
    backendAvailable.value = nextAvailable;
    backendMessage.value = message;
  },
});

const runningTimerIds = computed(() => new Set(Object.keys(store.runningTimers)));
const sourceSummary = computed(() => {
  if (store.sourceSettings.mode === "github-public") {
    const owner = store.sourceSettings.githubOwner || "<owner>";
    const repo = store.sourceSettings.githubRepo || "<repo>";
    const ref = store.sourceSettings.githubRef || "main";
    return `Loading recipes and shopping config from GitHub: ${owner}/${repo}@${ref}.`;
  }
  if (store.sourceSettings.mode === "backend-api") {
    return backendAvailable.value
      ? "Loading recipes and shared meal plan from the Phoenix backend."
      : `Phoenix backend unavailable: ${backendMessage.value || "request failed"}.`;
  }
  return "Loading recipes and shopping config from local HTTP files.";
});

provide(cookbookUiContextKey, {
  unitSystem: computed(() => store.unitSystem),
  scaleFactor: computed(() => store.scaleFactor),
  runningTimerIds,
  setUnitSystem: store.setUnitSystem,
  toggleTimer: store.toggleTimer,
  addTimeToTimer: store.addTimeToTimer,
  createCustomTimer: store.createCustomTimer,
});

onMounted(() => {
  source.start();
  if (store.sourceSettings.mode === "backend-api") {
    refreshBackendMealPlan();
  }
});

onUnmounted(() => {
  source.stop();
  store.cleanupTimers();
});

watch(
  () => JSON.stringify(store.sourceSettings),
  () => {
    void source.refresh(true);
    if (store.sourceSettings.mode === "backend-api") {
      refreshBackendMealPlan();
    }
  },
);

async function refreshBackendMealPlan() {
  try {
    const mealPlan = await fetchBackendMealPlan();
    store.replaceMealPlanWeek(mealPlan);
    backendAvailable.value = true;
    backendMessage.value = "";
  } catch (error) {
    backendAvailable.value = false;
    backendMessage.value = error instanceof Error ? error.message : "Backend unavailable";
  }
}

async function persistMealPlan() {
  if (store.sourceSettings.mode !== "backend-api") return;

  try {
    const saved = await saveBackendMealPlan(store.mealPlanWeek);
    store.replaceMealPlanWeek(saved);
    backendAvailable.value = true;
    backendMessage.value = "";
  } catch (error) {
    backendAvailable.value = false;
    backendMessage.value = error instanceof Error ? error.message : "Backend unavailable";
    await refreshBackendMealPlan();
  }
}

async function saveSettings(next: SourceSettings) {
  if (next.mode === "backend-api") {
    try {
      const saved = await saveBackendConfig(next);
      store.hydrateSourceSettings(saved.sourceSettings);
      store.setShoppingConfig(saved.shoppingConfig);
      backendAvailable.value = true;
      backendMessage.value = "";
      await source.refresh(true);
      await refreshBackendMealPlan();
    } catch (error) {
      backendAvailable.value = false;
      backendMessage.value = error instanceof Error ? error.message : "Backend unavailable";
    }
    return;
  }

  store.setSourceSettings(next);
  store.loadMealPlanFromStorage();
}

async function resetSettings() {
  store.resetSourceSettings();
  store.loadMealPlanFromStorage();
  await source.refresh(true);
}

async function setPlannedRecipe(dateIso: string, recipePath: string | null) {
  store.setPlannedRecipe(dateIso, recipePath);
  await persistMealPlan();
}

async function setPlannedServings(dateIso: string, servings: number) {
  store.setPlannedServings(dateIso, servings);
  await persistMealPlan();
}

async function generateRandomWeek(opts: { overwriteFilled: boolean }) {
  store.generateRandomWeek(opts);
  await persistMealPlan();
}

async function clearMealPlanWeek() {
  store.clearMealPlanWeek();
  await persistMealPlan();
}
</script>

<template>
  <div class="app">
    <TopBar :source-summary="sourceSummary" />
    <div v-if="store.sourceSettings.mode === 'backend-api' && !backendAvailable" class="empty backend-status">
      Shared backend unavailable. Reads and writes will not sync until `/api` responds again.
    </div>

    <main class="layout">
      <aside class="recipe-list">
        <div class="recipe-list-header">Recipes</div>
        <div v-if="store.recipes.length === 0" class="empty">No recipes loaded yet.</div>
        <RecipeTree
          v-else
          :root="store.treeData.root"
          :expanded-folders="store.expandedFolders"
          :active-path="store.activeRecipePath"
          @toggle-folder="store.toggleFolder"
          @select-recipe="store.selectRecipe"
        />
      </aside>

      <section class="content">
        <TabsBar :tab="store.tab" @set-tab="store.setTab" />

        <div v-if="store.tab === 'settings'">
          <SettingsPanel
            :settings="store.sourceSettings"
            @save="saveSettings"
            @reset="resetSettings"
          />
        </div>

        <div v-else-if="!store.activeRecipe" class="empty large">No recipes found for the current source.</div>

        <div v-else>
          <RecipeHero
            :title="store.activeRecipe.parsed.title || store.activeRecipe.name"
            :description="store.activeRecipe.parsed.description"
            :image="store.activeRecipe.parsed.image"
          />

          <IngredientsPanel
            v-if="store.tab === 'ingredients'"
            :recipe="store.activeRecipe"
            :servings-base="store.servingsBase"
            :servings-target="store.servingsTarget"
            :scale-factor="store.scaleFactor"
            @scale-down="store.scaleDown"
            @scale-up="store.scaleUp"
            @scale-reset="store.scaleReset"
          />

          <StepsPanel
            v-else-if="store.tab === 'steps'"
            :recipe="store.activeRecipe"
            :active-timers="store.activeTimers"
            :now-tick="store.nowTick"
          />

          <ToolsPanel v-else-if="store.tab === 'tools'" :recipe="store.activeRecipe" />
          <MealPlanPanel
            v-else-if="store.tab === 'meal-plan'"
            :week="store.mealPlanWeek"
            :recipes="store.recipes"
            @set-recipe="setPlannedRecipe($event.dateIso, $event.recipePath)"
            @set-servings="setPlannedServings($event.dateIso, $event.servings)"
            @generate-random="generateRandomWeek($event)"
            @clear-week="clearMealPlanWeek()"
          />
          <PlanShoppingPanel v-else :categories="store.planShoppingCategories" />
        </div>
      </section>
    </main>
  </div>
</template>
