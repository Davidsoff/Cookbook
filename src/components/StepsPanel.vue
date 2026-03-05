<script setup lang="ts">
import type { Recipe } from "../types/recipe";
import ActiveTimers from "./ActiveTimers.vue";
import StepsList from "./StepsList.vue";

const props = defineProps<{
  recipe: Recipe;
  activeTimers: { id: string; label: string; endsAt: number }[];
  nowTick: number;
}>();
</script>

<template>
  <section>
    <div class="steps-layout">
      <StepsList
        :steps="props.recipe.parsed.steps"
      />
      <ActiveTimers :timers="props.activeTimers" :now-tick="props.nowTick" />
    </div>
  </section>
</template>
