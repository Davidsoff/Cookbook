import { describe, expect, it } from "vitest";
import { buildShoppingList, buildShoppingListFromPlan, parseAisleConfig, parsePantryConfig } from "../src/lib/shopping";
import type { Ingredient } from "../src/types/recipe";
import type { PlannedRecipeEntry } from "../src/types/meal-plan";

function ingredient(name: string, amount: number, unit: string): Ingredient {
  return {
    name,
    quantityRaw: `${amount}%${unit}`,
    amountRaw: String(amount),
    unit,
    numeric: amount,
    fixed: false,
    preparation: "",
  };
}

describe("shopping", () => {
  it("parses aisle and pantry config", () => {
    const aisle = parseAisleConfig("[Produce]\nmint|onion\n[Dairy]\nmilk");
    const pantry = parsePantryConfig('mint = "1%cup"\nonion = { quantity = "200%g" }');

    expect(aisle.mint).toBe("Produce");
    expect(aisle.milk).toBe("Dairy");
    expect(pantry.mint.amount).toBe(1);
    expect(pantry.mint.unit).toBe("cup");
    expect(pantry.onion.amount).toBe(200);
    expect(pantry.onion.unit).toBe("g");
  });

  it("builds a shopping list with pantry subtraction and categories", () => {
    const ingredients: Ingredient[] = [ingredient("mint", 0.25, "cup"), ingredient("onion", 500, "g")];
    const shopping = buildShoppingList(ingredients, 1, "metric", {
      aisleByIngredient: { mint: "Produce", onion: "Produce" },
      pantryByIngredient: { mint: { amount: 0.1, unit: "cup" }, onion: { amount: 200, unit: "g" } },
    });

    expect(shopping).toHaveLength(1);
    expect(shopping[0].category).toBe("Produce");
    expect(shopping[0].items.find((item) => item.name.toLowerCase() === "mint")?.quantityText).toBe("35 ml");
    expect(shopping[0].items.find((item) => item.name.toLowerCase() === "onion")?.quantityText).toBe("300 g");
  });

  it("builds plan shopping list from planned entries", () => {
    const entries: PlannedRecipeEntry[] = [
      {
        day: { dateIso: "2026-03-05", recipePath: "recipes/mint.cook", servings: 4 },
        recipe: {
          name: "mint",
          path: "recipes/mint.cook",
          content: "",
          parsed: {
            title: "mint",
            description: "",
            image: "",
            servingsBase: 2,
            ingredients: [{ ...ingredient("mint", 0.25, "cup"), fixed: false, preparation: "" }],
            tools: [],
            steps: [],
          },
        },
      },
    ];
    const shopping = buildShoppingListFromPlan(entries, "metric", {
      aisleByIngredient: { mint: "Produce" },
      pantryByIngredient: {},
    });

    expect(shopping).toHaveLength(1);
    expect(shopping[0].items[0].quantityText).toBe("120 ml");
  });
});
