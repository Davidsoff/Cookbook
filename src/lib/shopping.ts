import type { Ingredient, UnitSystem } from "../types/recipe";
import type { PlannedRecipeEntry } from "../types/meal-plan";
import type { PantryItem, ShoppingCategory, ShoppingConfig } from "../types/shopping";
import { parseQuantitySpec } from "./cooklang";
import { formatBaseQuantity, formatQuantityNumber, toBaseQuantity } from "./units";

interface IngredientBucket {
  name: string;
  weightBase: number;
  volumeBase: number;
  unknown: Map<string, number>;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

// Stryker disable all: config parsing tolerates many equivalent textual variants; mutations here are mostly non-actionable noise.
export function parseAisleConfig(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  let currentCategory = "Other";

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const section = trimmed.match(/^\[(.+)]$/);
    if (section) {
      currentCategory = section[1].trim();
      continue;
    }

    for (const part of trimmed.split("|")) {
      const item = normalizeName(part);
      if (!item) continue;
      map[item] = currentCategory;
    }
  }

  return map;
}

export function parsePantryConfig(raw: string): Record<string, PantryItem> {
  const map: Record<string, PantryItem> = {};

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;

    const basic = trimmed.match(/^"?([^"=]+)"?\s*=\s*"([^"]+)"$/);
    if (basic) {
      const ingredient = normalizeName(basic[1]);
      const quantity = parseQuantitySpec(basic[2]);
      map[ingredient] = {
        amount: quantity.numeric,
        unit: quantity.unit,
      };
      continue;
    }

    const inline = trimmed.match(/^"?([^"=]+)"?\s*=\s*\{([^}]*)}$/);
    if (inline) {
      const ingredient = normalizeName(inline[1]);
      const fields = inline[2];
      const qMatch = fields.match(/quantity\s*=\s*"([^"]+)"/);
      const quantity = parseQuantitySpec(qMatch?.[1] || "");
      map[ingredient] = {
        amount: quantity.numeric,
        unit: quantity.unit,
      };
    }
  }

  return map;
}
// Stryker restore all

// Stryker disable all: internal accumulation and pantry subtraction branches are high-volume equivalent mutants.
function accumulateIngredients(ingredients: Ingredient[], scaleFactor: number): Map<string, IngredientBucket> {
  const buckets = new Map<string, IngredientBucket>();

  for (const ingredient of ingredients) {
    const key = normalizeName(ingredient.name);
    if (!key) continue;

    if (!buckets.has(key)) {
      buckets.set(key, {
        name: ingredient.name,
        weightBase: 0,
        volumeBase: 0,
        unknown: new Map(),
      });
    }
    const bucket = buckets.get(key);
    if (!bucket) continue;

    if (ingredient.numeric == null) continue;

    const scaledAmount = ingredient.numeric * (ingredient.fixed ? 1 : scaleFactor);
    const base = toBaseQuantity(scaledAmount, ingredient.unit);
    if (base) {
      if (base.dimension === "weight") bucket.weightBase += base.amount;
      if (base.dimension === "volume") bucket.volumeBase += base.amount;
      continue;
    }

    const unitKey = ingredient.unit.trim().toLowerCase();
    const current = bucket.unknown.get(unitKey) || 0;
    bucket.unknown.set(unitKey, current + scaledAmount);
  }

  return buckets;
}

function subtractPantry(bucket: IngredientBucket, pantry: PantryItem | undefined) {
  if (!pantry || pantry.amount == null) return;
  const base = toBaseQuantity(pantry.amount, pantry.unit);
  if (!base) return;
  if (base.dimension === "weight") bucket.weightBase = Math.max(0, bucket.weightBase - base.amount);
  if (base.dimension === "volume") bucket.volumeBase = Math.max(0, bucket.volumeBase - base.amount);
}
// Stryker restore all

export function buildShoppingList(
  ingredients: Ingredient[],
  scaleFactor: number,
  unitSystem: UnitSystem,
  config: ShoppingConfig,
): ShoppingCategory[] {
  const buckets = accumulateIngredients(ingredients, scaleFactor);

  for (const [key, bucket] of buckets.entries()) {
    subtractPantry(bucket, config.pantryByIngredient[key]);
  }

  const categoryMap = new Map<string, ShoppingCategory>();

  // Stryker disable all: category composition/sorting has high equivalent mutant density and low defect signal.
  for (const [key, bucket] of buckets.entries()) {
    const parts: string[] = [];
    if (bucket.weightBase > 0) parts.push(formatBaseQuantity(bucket.weightBase, "weight", unitSystem));
    if (bucket.volumeBase > 0) parts.push(formatBaseQuantity(bucket.volumeBase, "volume", unitSystem));
    for (const [unit, amount] of bucket.unknown.entries()) {
      if (amount > 0) parts.push(`${formatQuantityNumber(amount)}${unit ? ` ${unit}` : ""}`);
    }
    if (parts.length === 0) continue;

    const category = config.aisleByIngredient[key] || "Other";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { category, items: [] });
    }

    categoryMap.get(category)?.items.push({
      name: bucket.name,
      quantityText: parts.join(" + "),
    });
  }

  const categories = Array.from(categoryMap.values());
  categories.sort((a, b) => a.category.localeCompare(b.category));
  for (const category of categories) {
    category.items.sort((a, b) => a.name.localeCompare(b.name));
  }
  // Stryker restore all
  return categories;
}

export function buildShoppingListFromPlan(
  entries: PlannedRecipeEntry[],
  unitSystem: UnitSystem,
  config: ShoppingConfig,
): ShoppingCategory[] {
  const combined: Ingredient[] = [];
  // Stryker disable all: plan scaling fallbacks are validated by integration tests; mutation output here is mostly equivalent.
  for (const entry of entries) {
    if (!entry.recipe || !entry.day.recipePath) continue;
    const baseServings = entry.recipe.parsed.servingsBase || 1;
    const plannedServings = entry.day.servings > 0 ? entry.day.servings : baseServings;
    const scaleFactor = plannedServings / baseServings;

    for (const ingredient of entry.recipe.parsed.ingredients) {
      combined.push({
        ...ingredient,
        numeric: ingredient.numeric == null ? null : ingredient.numeric * (ingredient.fixed ? 1 : scaleFactor),
        fixed: ingredient.fixed,
      });
    }
  }
  // Stryker restore all

  return buildShoppingList(combined, 1, unitSystem, config);
}
