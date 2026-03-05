<script setup lang="ts">
import { formatNumber } from "../lib/cooklang";
import type { Recipe } from "../types/recipe";

defineProps<{
  recipe: Recipe;
}>();

function formatToolDisplay(tool: { numeric: number | null; quantityRaw: string; unit: string }): string {
  if (tool.numeric == null) return tool.quantityRaw || "";
  return `${formatNumber(tool.numeric)}${tool.unit ? ` ${tool.unit}` : ""}`;
}
</script>

<template>
  <section>
    <ul id="tool-list">
      <li v-for="tool in recipe.parsed.tools" :key="`${tool.name}-${tool.quantityRaw}`">
        <span>{{ tool.name }}</span>
        <span class="muted">{{ formatToolDisplay(tool) || "-" }}</span>
      </li>
    </ul>
    <div v-if="recipe.parsed.tools.length === 0" class="empty">No tools parsed from this recipe.</div>
  </section>
</template>
