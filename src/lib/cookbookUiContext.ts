import type { ComputedRef, InjectionKey } from "vue";
import { inject } from "vue";
import type { UnitSystem } from "../types/recipe";

// Stryker disable all: dependency-injection wiring is framework glue; mutation signal is low without dedicated integration harness.
export interface CookbookUiContext {
  unitSystem: ComputedRef<UnitSystem>;
  scaleFactor: ComputedRef<number>;
  runningTimerIds: ComputedRef<Set<string>>;
  setUnitSystem: (unit: UnitSystem) => void;
  toggleTimer: (timerId: string) => void;
  addTimeToTimer: (timerId: string, extraSeconds: number) => void;
  createCustomTimer: (minutes: number, label: string) => void;
}

export const cookbookUiContextKey: InjectionKey<CookbookUiContext> = Symbol("cookbookUiContext");

export function useCookbookUiContext(): CookbookUiContext {
  const ctx = inject(cookbookUiContextKey);
  if (!ctx) {
    throw new Error("Cookbook UI context is not available");
  }
  return ctx;
}
// Stryker restore all
