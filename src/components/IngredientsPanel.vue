<script setup lang="ts">
import { computed } from "vue";
import { aggregateIngredientsForDisplay } from "../lib/units";
import type { Recipe } from "../types/recipe";
import IngredientsScaleControls from "./IngredientsScaleControls.vue";
import { useCookbookUiContext } from "../lib/cookbookUiContext";

const props = defineProps<{
  recipe: Recipe;
  servingsBase: number;
  servingsTarget: number;
  scaleFactor: number;
}>();

const emit = defineEmits<{
  (e: "scale-down"): void;
  (e: "scale-up"): void;
  (e: "scale-reset"): void;
}>();

const ui = useCookbookUiContext();

const aggregatedIngredients = computed(() =>
  aggregateIngredientsForDisplay(props.recipe.parsed.ingredients, props.scaleFactor, ui.unitSystem.value),
);
</script>

<template>
  <section>
    <IngredientsScaleControls
      :servings-base="servingsBase"
      :servings-target="servingsTarget"
      :scale-factor="scaleFactor"
      @scale-down="emit('scale-down')"
      @scale-up="emit('scale-up')"
      @scale-reset="emit('scale-reset')"
    />

    <ul id="ingredient-list">
      <li v-for="ingredient in aggregatedIngredients" :key="ingredient.name">
        <span>{{ ingredient.name }}</span>
        <span class="muted">{{ ingredient.quantityText }}</span>
      </li>
    </ul>
  </section>
</template>
