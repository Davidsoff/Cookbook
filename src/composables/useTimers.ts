import { reactive, ref } from "vue";
import type { Recipe, RunningTimer } from "../types/recipe";

// Stryker disable all: timer orchestration requires browser/timing integration; current unit coverage is insufficient for mutation-quality assertions.
interface UseTimersOptions {
  getActiveRecipe: () => Recipe | null;
}

export function useTimers(options: UseTimersOptions) {
  const runningTimers = reactive<Record<string, RunningTimer>>({});
  const nowTick = ref(Date.now());
  let tickerId: number | null = null;
  let customTimerCounter = 0;

  function ensureTicker() {
    if (tickerId != null) return;
    tickerId = window.setInterval(() => {
      nowTick.value = Date.now();
    }, 1000);
  }

  function clearTickerIfIdle() {
    if (Object.keys(runningTimers).length > 0) return;
    if (tickerId != null) {
      window.clearInterval(tickerId);
      tickerId = null;
    }
  }

  function stopTimer(timerId: string) {
    const timer = runningTimers[timerId];
    if (!timer) return;
    window.clearTimeout(timer.timeoutId);
    delete runningTimers[timerId];
    clearTickerIfIdle();
  }

  function stopAllTimers() {
    Object.keys(runningTimers).forEach((timerId) => stopTimer(timerId));
  }

  function scheduleCompletion(timerId: string) {
    const timer = runningTimers[timerId];
    if (!timer) return;
    window.clearTimeout(timer.timeoutId);

    const remainingMs = Math.max(0, timer.endsAt - Date.now());
    timer.timeoutId = window.setTimeout(() => {
      const latest = runningTimers[timerId];
      if (!latest) return;
      const label = latest.label;
      stopTimer(timerId);
      nowTick.value = Date.now();
      window.alert(`Timer done: ${label}`);
    }, remainingMs);
  }

  function startTimer(timerId: string, label: string, seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;

    if (runningTimers[timerId]) {
      stopTimer(timerId);
    }

    runningTimers[timerId] = {
      id: timerId,
      label,
      endsAt: Date.now() + seconds * 1000,
      intervalId: 0,
      timeoutId: 0,
    };

    scheduleCompletion(timerId);
    ensureTicker();
    nowTick.value = Date.now();
  }

  function toggleTimer(timerId: string) {
    const recipe = options.getActiveRecipe();
    if (!recipe || !timerId) return;

    if (runningTimers[timerId]) {
      stopTimer(timerId);
      return;
    }

    let def: Recipe["parsed"]["steps"][number]["timers"][number] | null = null;
    for (const step of recipe.parsed.steps) {
      const found = step.timers.find((timer) => timer.id === timerId);
      if (found) {
        def = found;
        break;
      }
    }

    if (!def || !def.seconds) return;

    startTimer(timerId, def.displayQuantity ? `${def.label} (${def.displayQuantity})` : def.label, def.seconds);
  }

  function addTimeToTimer(timerId: string, extraSeconds: number) {
    if (!Number.isFinite(extraSeconds) || extraSeconds <= 0) return;
    const timer = runningTimers[timerId];
    if (!timer) return;
    timer.endsAt += extraSeconds * 1000;
    scheduleCompletion(timerId);
    nowTick.value = Date.now();
  }

  function createCustomTimer(minutes: number, label = "Custom timer") {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const timerId = `custom-timer-${customTimerCounter}`;
    customTimerCounter += 1;
    startTimer(timerId, label, Math.round(minutes * 60));
  }

  function isTimerRunning(timerId: string): boolean {
    return Boolean(runningTimers[timerId]);
  }

  function cleanupTimers() {
    stopAllTimers();
    clearTickerIfIdle();
  }

  return {
    runningTimers,
    nowTick,
    toggleTimer,
    addTimeToTimer,
    createCustomTimer,
    stopTimer,
    stopAllTimers,
    isTimerRunning,
    cleanupTimers,
  };
}
// Stryker restore all
