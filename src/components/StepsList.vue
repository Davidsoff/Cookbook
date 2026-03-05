<script setup lang="ts">
import { tokenizeStepText } from "../lib/cooklang";
import type { Step } from "../types/recipe";
import StepToken from "./StepToken.vue";

defineProps<{
  steps: Step[];
}>();

function instructionNumber(steps: Step[], index: number): number {
  let count = 0;
  for (let i = 0; i <= index; i += 1) {
    if (steps[i]?.kind === "instruction") count += 1;
  }
  return count;
}
</script>

<template>
  <ol id="step-list">
    <li v-for="(step, index) in steps" :key="`${index}-${step.text}`">
      <template v-if="step.kind === 'section'">
        <strong class="step-section">{{ step.text }}</strong>
      </template>
      <template v-else-if="step.kind === 'note'">
        <span class="step-note">Note: {{ step.text }}</span>
      </template>
      <template v-else>
        <strong>{{ instructionNumber(steps, index) }}.</strong>
        <template v-for="(token, tokenIndex) in tokenizeStepText(step.text, step.timers)" :key="`${index}-${tokenIndex}`">
          <StepToken :token="token" />
        </template>
      </template>
    </li>
  </ol>
</template>
