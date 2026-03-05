<script setup lang="ts">
import { formatClock, getRemainingTimerSeconds } from "../lib/time";
import { useCookbookUiContext } from "../lib/cookbookUiContext";

const props = defineProps<{
  timer: { id: string; label: string; endsAt: number };
  nowTick: number;
}>();
const ui = useCookbookUiContext();

function remaining(endsAt: number): number {
  props.nowTick;
  return getRemainingTimerSeconds({
    id: "preview",
    label: "preview",
    endsAt,
    intervalId: 0,
    timeoutId: 0,
  });
}
</script>

<template>
  <li>
    <div class="timer-main">
      <span>{{ timer.label }}</span>
      <span>{{ formatClock(remaining(timer.endsAt)) }}</span>
    </div>
    <div class="timer-actions">
      <button type="button" @click="ui.addTimeToTimer(timer.id, 60)">+1m</button>
      <button type="button" @click="ui.addTimeToTimer(timer.id, 600)">+10m</button>
      <button type="button" @click="ui.toggleTimer(timer.id)">Cancel</button>
    </div>
  </li>
</template>
