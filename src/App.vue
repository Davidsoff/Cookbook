<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, reactive, watch } from "vue";
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

const store = reactive(useCookbookStore());

const source = useRecipesSource({
  getSettings: () => store.sourceSettings,
  onData: ({ recipes, shoppingConfig }) => {
    store.applyRecipes(recipes);
    store.setShoppingConfig(shoppingConfig);
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
});

onUnmounted(() => {
  source.stop();
  store.cleanupTimers();
});

watch(
  () => JSON.stringify(store.sourceSettings),
  () => {
    source.refresh(true).catch(console.error);
  },
);

function saveSettings(next: SourceSettings) {
  store.setSourceSettings(next);
}
</script>

<template>
  <div class="app">
    <TopBar :source-summary="sourceSummary" />

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
            @reset="
              store.resetSourceSettings();
              source.refresh(true);
            "
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
            @set-recipe="store.setPlannedRecipe($event.dateIso, $event.recipePath)"
            @set-servings="store.setPlannedServings($event.dateIso, $event.servings)"
            @generate-random="store.generateRandomWeek($event)"
            @clear-week="store.clearMealPlanWeek()"
          />
          <PlanShoppingPanel v-else :categories="store.planShoppingCategories" />
        </div>
      </section>
    </main>
  </div>
</template>
