<script setup lang="ts">
import type { ShoppingCategory } from "../types/shopping";

defineProps<{
  categories: ShoppingCategory[];
}>();
</script>

<template>
  <section>
    <div v-if="categories.length === 0" class="empty">No planned meals yet, or pantry covers all measurable ingredients.</div>
    <div v-for="category in categories" :key="category.category" class="shopping-category">
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
