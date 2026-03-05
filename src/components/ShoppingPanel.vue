<script setup lang="ts">
import { computed } from "vue";
import { buildShoppingList } from "../lib/shopping";
import { useCookbookUiContext } from "../lib/cookbookUiContext";
import type { Recipe } from "../types/recipe";
import type { ShoppingConfig } from "../types/shopping";

const props = defineProps<{
  recipe: Recipe;
  shoppingConfig: ShoppingConfig;
}>();

const ui = useCookbookUiContext();

const shoppingCategories = computed(() =>
  buildShoppingList(props.recipe.parsed.ingredients, ui.scaleFactor.value, ui.unitSystem.value, props.shoppingConfig),
);
</script>

<template>
  <section>
    <div v-if="shoppingCategories.length === 0" class="empty">Nothing to buy. Pantry covers all measurable ingredients.</div>
    <div v-for="category in shoppingCategories" :key="category.category" class="shopping-category">
      <h3>{{ category.category }}</h3>
      <ul class="shopping-list">
        <li v-for="item in category.items" :key="`${category.category}-${item.name}`">
          <span>{{ item.name }}</span>
          <span class="muted">{{ item.quantityText }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
