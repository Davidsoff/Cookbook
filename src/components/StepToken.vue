<script setup lang="ts">
import { parseQuantitySpec, type StepToken } from "../lib/cooklang";
import { formatScaledAmount } from "../lib/units";
import { useCookbookUiContext } from "../lib/cookbookUiContext";

const props = defineProps<{
  token: StepToken;
}>();
const ui = useCookbookUiContext();

function displayTokenQuantity(): string {
  if (props.token.kind !== "ingredient" || !props.token.rawQuantity) {
    return props.token.quantityText || "";
  }
  const quantity = parseQuantitySpec(props.token.rawQuantity);
  if (quantity.numeric == null) {
    return props.token.quantityText || "";
  }
  return formatScaledAmount(quantity.numeric, quantity.unit, ui.scaleFactor.value, ui.unitSystem.value, quantity.fixed);
}
</script>

<template>
  <span v-if="token.kind === 'text'">{{ token.text }}</span>
  <span v-else-if="token.kind === 'ingredient'" class="inline-token ingredient">
    <span>{{ token.text }}</span>
    <span v-if="displayTokenQuantity()" class="inline-token-qty">{{ displayTokenQuantity() }}</span>
  </span>
  <span v-else-if="token.kind === 'tool'" class="inline-token tool">
    <span>{{ token.text }}</span>
    <span v-if="token.quantityText" class="inline-token-qty">{{ token.quantityText }}</span>
  </span>
  <button
    v-else
    type="button"
    class="inline-token timer click-target"
    :class="{ running: token.timerId && ui.runningTimerIds.value.has(token.timerId) }"
    @click="token.timerId && ui.toggleTimer(token.timerId)"
  >
    <span>{{ token.text }}</span>
    <span v-if="token.quantityText" class="inline-token-qty">{{ token.quantityText }}</span>
  </button>
</template>
