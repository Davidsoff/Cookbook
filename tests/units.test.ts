import { describe, expect, it } from "vitest";
import {
  aggregateIngredientsForDisplay,
  formatQuantityNumber,
  formatScaledAmount,
  formatScaledIngredient,
  normalizeUnitKey,
  toBaseQuantity,
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
    expect(formatQuantityNumber(2.99999)).toBe("3");
    expect(formatQuantityNumber(1.07)).toBe("1.07");
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

  it("keeps US volume label when already in US system volume unit", () => {
    expect(formatScaledAmount(2, "cup_us", 1, "us")).toBe("2 cup");
  });

  it("normalizes canonical and alias unit keys", () => {
    expect(normalizeUnitKey("cup_us")).toBe("cup_us");
    expect(normalizeUnitKey("cup")).toBe("cup_us");
    expect(normalizeUnitKey("fl oz")).toBe("floz_us");
    expect(normalizeUnitKey("")).toBe("");
  });

  it("normalizes common unit aliases consistently", () => {
    expect(normalizeUnitKey("gram")).toBe("g");
    expect(normalizeUnitKey("grams")).toBe("g");
    expect(normalizeUnitKey("kilogram")).toBe("kg");
    expect(normalizeUnitKey("kilograms")).toBe("kg");
    expect(normalizeUnitKey("ounce")).toBe("oz");
    expect(normalizeUnitKey("pound")).toBe("lb");
    expect(normalizeUnitKey("milliliters")).toBe("ml");
    expect(normalizeUnitKey("litres")).toBe("l");
    expect(normalizeUnitKey("teaspoon")).toBe("tsp_us");
    expect(normalizeUnitKey("tablespoon")).toBe("tbsp_us");
    expect(normalizeUnitKey("fluidounce")).toBe("floz_us");
    expect(normalizeUnitKey("pt")).toBe("pint_us");
    expect(normalizeUnitKey("qt")).toBe("quart_us");
    expect(normalizeUnitKey("gal")).toBe("gallon_us");
  });

  it("normalizes all declared aliases", () => {
    const cases: Array<[string, string]> = [
      ["g", "g"],
      ["gram", "g"],
      ["grams", "g"],
      ["kg", "kg"],
      ["kgs", "kg"],
      ["kilogram", "kg"],
      ["kilograms", "kg"],
      ["oz", "oz"],
      ["ounce", "oz"],
      ["ounces", "oz"],
      ["lb", "lb"],
      ["lbs", "lb"],
      ["pound", "lb"],
      ["pounds", "lb"],
      ["ml", "ml"],
      ["milliliter", "ml"],
      ["milliliters", "ml"],
      ["millilitre", "ml"],
      ["millilitres", "ml"],
      ["l", "l"],
      ["liter", "l"],
      ["liters", "l"],
      ["litre", "l"],
      ["litres", "l"],
      ["tsp", "tsp_us"],
      ["teaspoon", "tsp_us"],
      ["teaspoons", "tsp_us"],
      ["tbsp", "tbsp_us"],
      ["tablespoon", "tbsp_us"],
      ["tablespoons", "tbsp_us"],
      ["fl oz", "floz_us"],
      ["floz", "floz_us"],
      ["fluidounce", "floz_us"],
      ["fluidounces", "floz_us"],
      ["cup", "cup_us"],
      ["cups", "cup_us"],
      ["c", "cup_us"],
      ["pt", "pint_us"],
      ["pint", "pint_us"],
      ["pints", "pint_us"],
      ["qt", "quart_us"],
      ["quart", "quart_us"],
      ["quarts", "quart_us"],
      ["gal", "gallon_us"],
      ["gallon", "gallon_us"],
      ["gallons", "gallon_us"],
    ];
    for (const [input, expected] of cases) {
      expect(normalizeUnitKey(input)).toBe(expected);
    }
  });

  it("converts base quantities for representative units", () => {
    expect(formatScaledAmount(1, "oz", 1, "metric")).toBe("30 g");
    expect(formatScaledAmount(1, "lb", 1, "metric")).toBe("450 g");
    expect(formatScaledAmount(1, "l", 1, "metric")).toBe("1 l");
    expect(formatScaledAmount(1, "tsp", 1, "us")).toBe("1 tsp");
    expect(formatScaledAmount(1, "gallon", 1, "us")).toBe("1 gallon");
  });

  it("has working base definitions for each canonical unit key", () => {
    expect(toBaseQuantity(1, "g")).toEqual({ amount: 1, dimension: "weight" });
    expect(toBaseQuantity(1, "kg")).toEqual({ amount: 1000, dimension: "weight" });
    expect(toBaseQuantity(1, "oz")?.dimension).toBe("weight");
    expect(toBaseQuantity(1, "lb")?.dimension).toBe("weight");
    expect(toBaseQuantity(1, "ml")).toEqual({ amount: 1, dimension: "volume" });
    expect(toBaseQuantity(1, "l")).toEqual({ amount: 1000, dimension: "volume" });
    expect(toBaseQuantity(1, "tsp_us")?.dimension).toBe("volume");
    expect(toBaseQuantity(1, "tbsp_us")?.dimension).toBe("volume");
    expect(toBaseQuantity(1, "floz_us")?.dimension).toBe("volume");
    expect(toBaseQuantity(1, "cup_us")?.dimension).toBe("volume");
    expect(toBaseQuantity(1, "pint_us")?.dimension).toBe("volume");
    expect(toBaseQuantity(1, "quart_us")?.dimension).toBe("volume");
    expect(toBaseQuantity(1, "gallon_us")?.dimension).toBe("volume");
  });
});
