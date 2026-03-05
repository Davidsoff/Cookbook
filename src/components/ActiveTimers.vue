<script setup lang="ts">
import ActiveTimerItem from "./ActiveTimerItem.vue";
import { useCookbookUiContext } from "../lib/cookbookUiContext";

const props = defineProps<{
  timers: { id: string; label: string; endsAt: number }[];
  nowTick: number;
}>();
const ui = useCookbookUiContext();

function createCustomTimer() {
  const minutesInput = window.prompt("Custom timer length in minutes", "5");
  if (minutesInput == null) return;
  const minutes = Number.parseFloat(minutesInput.trim());
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  ui.createCustomTimer(minutes, "Custom timer");
}
</script>

<template>
  <aside class="active-timers">
    <div class="timer-header-row">
      <h3>Active Timers</h3>
      <button type="button" @click="createCustomTimer">Custom Timer</button>
    </div>
    <ul id="active-timer-list">
      <ActiveTimerItem
        v-for="timer in props.timers"
        :key="timer.id"
        :timer="timer"
        :now-tick="props.nowTick"
      />
    </ul>
    <div v-if="props.timers.length === 0" class="empty">No active timers.</div>
  </aside>
</template>
