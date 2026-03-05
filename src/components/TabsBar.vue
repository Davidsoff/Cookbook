<script setup lang="ts">
import type { Tab } from "../types/recipe";

defineProps<{
  tab: Tab;
}>();

const emit = defineEmits<{
  (e: "set-tab", tab: Tab): void;
}>();
</script>

<template>
  <div class="tabs">
    <button :class="{ active: tab === 'ingredients' }" type="button" @click="emit('set-tab', 'ingredients')">Ingredients</button>
    <button :class="{ active: tab === 'steps' }" type="button" @click="emit('set-tab', 'steps')">Steps</button>
    <button :class="{ active: tab === 'tools' }" type="button" @click="emit('set-tab', 'tools')">Tools</button>
    <button :class="{ active: tab === 'shopping' }" type="button" @click="emit('set-tab', 'shopping')">Shopping</button>
  </div>
</template>
