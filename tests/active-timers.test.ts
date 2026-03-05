/** @vitest-environment jsdom */
import { computed } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ActiveTimers from "../src/components/ActiveTimers.vue";
import { cookbookUiContextKey } from "../src/lib/cookbookUiContext";

describe("ActiveTimers custom timer", () => {
  it("creates a custom timer from minutes prompt", async () => {
    const createCustomTimer = vi.fn();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValueOnce("5");

    const wrapper = mount(ActiveTimers, {
      props: {
        timers: [],
        nowTick: Date.now(),
      },
      global: {
        provide: {
          [cookbookUiContextKey as symbol]: {
            unitSystem: computed(() => "metric" as const),
            scaleFactor: computed(() => 1),
            runningTimerIds: computed(() => new Set<string>()),
            setUnitSystem: vi.fn(),
            toggleTimer: vi.fn(),
            addTimeToTimer: vi.fn(),
            createCustomTimer,
          },
        },
      },
    });

    await wrapper.get(".timer-header-row button").trigger("click");
    expect(createCustomTimer).toHaveBeenCalledWith(5, "Custom timer");
    promptSpy.mockRestore();
  });
});
