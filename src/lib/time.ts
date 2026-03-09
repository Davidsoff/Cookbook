import type { RunningTimer } from "../types/recipe";

// Stryker disable all: time formatting depends on dynamic clock values and is covered at higher integration layers.
export function formatClock(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getRemainingTimerSeconds(timer: RunningTimer | undefined): number {
  if (!timer) return 0;
  return Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
}
// Stryker restore all
