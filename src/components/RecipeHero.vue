<script setup lang="ts">
import { useCookbookUiContext } from "../lib/cookbookUiContext";

defineProps<{
  title: string;
  description: string;
  image: string;
}>();

const ui = useCookbookUiContext();
</script>

<template>
  <div class="recipe-hero">
    <div v-if="image" class="recipe-hero-image-wrap">
      <img :src="image" alt="Recipe image" />
    </div>
    <div class="recipe-hero-content">
      <h2>{{ title }}</h2>
      <p class="recipe-description">{{ description || "No description provided." }}</p>
      <div class="hero-controls">
        <div class="unit-picker">
          <span>Units</span>
          <div class="segmented-control" role="group" aria-label="Unit system">
            <button
              type="button"
              class="unit-segment"
              :class="{ active: ui.unitSystem.value === 'metric' }"
              @click="ui.setUnitSystem('metric')"
            >
              Metric
            </button>
            <button
              type="button"
              class="unit-segment"
              :class="{ active: ui.unitSystem.value === 'us' }"
              @click="ui.setUnitSystem('us')"
            >
              US Customary
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
