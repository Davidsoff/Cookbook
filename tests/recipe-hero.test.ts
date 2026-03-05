/** @vitest-environment jsdom */
import { computed } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import RecipeHero from "../src/components/RecipeHero.vue";
import { cookbookUiContextKey } from "../src/lib/cookbookUiContext";

describe("RecipeHero unit selector", () => {
  it("highlights selected unit and triggers setUnitSystem", async () => {
    const unitSystem = computed(() => "metric" as const);
    const setUnitSystem = vi.fn();

    const wrapper = mount(RecipeHero, {
      props: {
        title: "Test",
        description: "Desc",
        image: "",
      },
      global: {
        provide: {
          [cookbookUiContextKey as symbol]: {
            unitSystem,
            scaleFactor: computed(() => 1),
            runningTimerIds: computed(() => new Set<string>()),
            setUnitSystem,
            toggleTimer: vi.fn(),
            addTimeToTimer: vi.fn(),
            createCustomTimer: vi.fn(),
          },
        },
      },
    });

    const buttons = wrapper.findAll(".unit-segment");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].classes()).toContain("active");
    expect(buttons[1].classes()).not.toContain("active");

    await buttons[1].trigger("click");
    expect(setUnitSystem).toHaveBeenCalledWith("us");
  });
});
