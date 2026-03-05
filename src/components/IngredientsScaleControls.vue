<script setup lang="ts">
import { formatNumber } from "../lib/cooklang";

defineProps<{
  servingsBase: number;
  servingsTarget: number;
  scaleFactor: number;
}>();

const emit = defineEmits<{
  (e: "scale-down"): void;
  (e: "scale-up"): void;
  (e: "scale-reset"): void;
}>();
</script>

<template>
  <div class="scale-controls">
    <div class="muted">
      Base servings: {{ formatNumber(servingsBase) }} | Target servings: {{ formatNumber(servingsTarget) }} | Scale:
      {{ formatNumber(scaleFactor) }}x
    </div>
    <div class="scale-row">
      <div class="scale-buttons">
        <button type="button" @click="emit('scale-down')">-</button>
        <button type="button" @click="emit('scale-up')">+</button>
        <button type="button" @click="emit('scale-reset')">Reset</button>
      </div>
    </div>
  </div>
</template>
