import { describe, expect, it } from "vitest";
import {
  aggregateIngredientsForDisplay,
  formatQuantityNumber,
  formatScaledAmount,
  formatScaledIngredient,
} from "../src/lib/units";
import type { Ingredient } from "../src/types/recipe";

function ingredient(amount: number, unit: string): Ingredient {
  return {
    name: "item",
    quantityRaw: `${amount}%${unit}`,
    amountRaw: String(amount),
    unit,
    numeric: amount,
    fixed: false,
    preparation: "",
  };
}

describe("units", () => {
  it("scales metric ingredient", () => {
    expect(formatScaledIngredient(ingredient(100, "g"), 2, "metric")).toBe("200 g");
  });

  it("converts metric weight to us", () => {
    expect(formatScaledIngredient(ingredient(1000, "g"), 1, "us")).toBe("2 1/5 lb");
  });

  it("keeps unknown units in original form", () => {
    expect(formatScaledIngredient(ingredient(2, "pinch"), 3, "metric")).toBe("6 pinch");
  });

  it("aggregates same ingredient names and sums compatible units", () => {
    const ingredients: Ingredient[] = [
      ingredient(500, "g"),
      ingredient(0.5, "kg"),
      { ...ingredient(2, "cup"), name: "milk" },
      { ...ingredient(8, "tbsp"), name: "milk" },
    ];
    ingredients[0].name = "flour";
    ingredients[1].name = "Flour";

    const aggregated = aggregateIngredientsForDisplay(ingredients, 1, "metric");
    expect(aggregated).toEqual([
      { name: "flour", quantityText: "1 kg" },
      { name: "milk", quantityText: "590 ml" },
    ]);
  });

  it("formats common decimals as fractions (1/2 through 1/10)", () => {
    expect(formatQuantityNumber(0.5)).toBe("1/2");
    expect(formatQuantityNumber(0.25)).toBe("1/4");
    expect(formatQuantityNumber(0.2)).toBe("1/5");
    expect(formatQuantityNumber(0.1)).toBe("1/10");
    expect(formatQuantityNumber(1.5)).toBe("1 1/2");
  });

  it("converts/scales amounts for step tokens", () => {
    expect(formatScaledAmount(0.5, "cup", 1, "metric")).toBe("120 ml");
    expect(formatScaledAmount(1, "tbsp", 2, "metric")).toBe("30 ml");
    expect(formatScaledAmount(1, "kg", 0.5, "us")).toBe("1 1/10 lb");
  });

  it("does not scale fixed quantities", () => {
    const fixedIngredient = { ...ingredient(2, "tbsp"), fixed: true };
    expect(formatScaledIngredient(fixedIngredient, 3, "metric")).toBe("30 ml");
  });
});
