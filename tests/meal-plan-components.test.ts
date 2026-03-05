/** @vitest-environment jsdom */
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MealPlanPanel from "../src/components/MealPlanPanel.vue";
import PlanShoppingPanel from "../src/components/PlanShoppingPanel.vue";
import type { MealPlanWeek } from "../src/types/meal-plan";
import type { Recipe } from "../src/types/recipe";

function makeRecipe(path: string, title: string): Recipe {
  return {
    name: title,
    path,
    content: "",
    parsed: {
      title,
      description: "",
      image: "",
      servingsBase: 2,
      ingredients: [],
      tools: [],
      steps: [],
    },
  };
}

describe("meal plan components", () => {
  it("emits changes from meal plan rows", async () => {
    const week: MealPlanWeek = {
      startDateIso: "2026-03-05",
      days: [
        { dateIso: "2026-03-05", recipePath: null, servings: 1 },
        { dateIso: "2026-03-06", recipePath: null, servings: 1 },
        { dateIso: "2026-03-07", recipePath: null, servings: 1 },
        { dateIso: "2026-03-08", recipePath: null, servings: 1 },
        { dateIso: "2026-03-09", recipePath: null, servings: 1 },
        { dateIso: "2026-03-10", recipePath: null, servings: 1 },
        { dateIso: "2026-03-11", recipePath: null, servings: 1 },
      ],
    };
    const recipes = [makeRecipe("recipes/a.cook", "A")];
    const wrapper = mount(MealPlanPanel, { props: { week, recipes } });

    const select = wrapper.find("select");
    await select.setValue("recipes/a.cook");
    expect(wrapper.emitted("set-recipe")?.[0]?.[0]).toEqual({ dateIso: "2026-03-05", recipePath: "recipes/a.cook" });

    const input = wrapper.find("input[type='number']");
    await input.setValue("4");
    await input.trigger("change");
    expect(wrapper.emitted("set-servings")?.[0]?.[0]).toEqual({ dateIso: "2026-03-05", servings: 4 });
  });

  it("renders plan shopping categories and empty state", () => {
    const empty = mount(PlanShoppingPanel, { props: { categories: [] } });
    expect(empty.text()).toContain("No planned meals yet");

    const full = mount(PlanShoppingPanel, {
      props: {
        categories: [{ category: "Produce", items: [{ name: "mint", quantityText: "60 ml" }] }],
      },
    });
    expect(full.text()).toContain("Produce");
    expect(full.text()).toContain("mint");
    expect(full.text()).toContain("60 ml");
  });
});
