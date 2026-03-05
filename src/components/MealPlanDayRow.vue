<script setup lang="ts">
import type { MealPlanDay } from "../types/meal-plan";
import type { Recipe } from "../types/recipe";

const props = defineProps<{
  day: MealPlanDay;
  recipes: Recipe[];
}>();

const emit = defineEmits<{
  (e: "set-recipe", payload: { dateIso: string; recipePath: string | null }): void;
  (e: "set-servings", payload: { dateIso: string; servings: number }): void;
  (e: "clear", dateIso: string): void;
}>();

function formatDate(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00`);
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const label = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return dateIso === todayIso ? `${label} (Today)` : label;
}

function onRecipeChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const value = target.value || null;
  emit("set-recipe", { dateIso: props.day.dateIso, recipePath: value });
}

function onServingsChange(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("set-servings", { dateIso: props.day.dateIso, servings: Number.parseInt(target.value, 10) || 1 });
}
</script>

<template>
  <div class="meal-plan-row">
    <div class="meal-plan-date">{{ formatDate(day.dateIso) }}</div>
    <select :value="day.recipePath || ''" @change="onRecipeChange">
      <option value="">No recipe</option>
      <option v-for="recipe in recipes" :key="recipe.path" :value="recipe.path">
        {{ recipe.parsed.title || recipe.name }}
      </option>
    </select>
    <input
      type="number"
      min="1"
      max="64"
      :value="day.servings"
      @change="onServingsChange"
    />
    <button type="button" @click="emit('clear', day.dateIso)">Clear</button>
  </div>
</template>
