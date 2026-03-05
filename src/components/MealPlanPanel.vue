<script setup lang="ts">
import type { MealPlanWeek } from "../types/meal-plan";
import type { Recipe } from "../types/recipe";
import MealPlanDayRow from "./MealPlanDayRow.vue";

const props = defineProps<{
  week: MealPlanWeek;
  recipes: Recipe[];
}>();

const emit = defineEmits<{
  (e: "set-recipe", payload: { dateIso: string; recipePath: string | null }): void;
  (e: "set-servings", payload: { dateIso: string; servings: number }): void;
  (e: "generate-random", payload: { overwriteFilled: boolean }): void;
  (e: "clear-week"): void;
}>();
</script>

<template>
  <section>
    <div class="meal-plan-actions">
      <button type="button" @click="emit('generate-random', { overwriteFilled: false })">Fill Empty Randomly</button>
      <button type="button" @click="emit('generate-random', { overwriteFilled: true })">Regenerate Week</button>
      <button type="button" @click="emit('clear-week')">Clear Week</button>
    </div>

    <div class="meal-plan-list">
      <MealPlanDayRow
        v-for="day in props.week.days"
        :key="day.dateIso"
        :day="day"
        :recipes="props.recipes"
        @set-recipe="emit('set-recipe', $event)"
        @set-servings="emit('set-servings', $event)"
        @clear="emit('set-recipe', { dateIso: $event, recipePath: null })"
      />
    </div>
  </section>
</template>
