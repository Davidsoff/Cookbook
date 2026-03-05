import type { Ingredient, UnitSystem } from "../types/recipe";
import { formatNumber } from "./cooklang";

interface UnitDef {
  dimension: "weight" | "volume";
  toBase: number;
}

const UNIT_DEFS: Record<string, UnitDef> = {
  g: { dimension: "weight", toBase: 1 },
  kg: { dimension: "weight", toBase: 1000 },
  oz: { dimension: "weight", toBase: 28.349523125 },
  lb: { dimension: "weight", toBase: 453.59237 },
  ml: { dimension: "volume", toBase: 1 },
  l: { dimension: "volume", toBase: 1000 },
  tsp_us: { dimension: "volume", toBase: 4.92892159375 },
  tbsp_us: { dimension: "volume", toBase: 14.78676478125 },
  floz_us: { dimension: "volume", toBase: 29.5735295625 },
  cup_us: { dimension: "volume", toBase: 236.5882365 },
  pint_us: { dimension: "volume", toBase: 473.176473 },
  quart_us: { dimension: "volume", toBase: 946.352946 },
  gallon_us: { dimension: "volume", toBase: 3785.411784 },
};

const UNIT_ALIASES: Record<string, string> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kgs: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  tsp: "tsp_us",
  teaspoon: "tsp_us",
  teaspoons: "tsp_us",
  tbsp: "tbsp_us",
  tablespoon: "tbsp_us",
  tablespoons: "tbsp_us",
  "fl oz": "floz_us",
  floz: "floz_us",
  fluidounce: "floz_us",
  fluidounces: "floz_us",
  cup: "cup_us",
  cups: "cup_us",
  c: "cup_us",
  pt: "pint_us",
  pint: "pint_us",
  pints: "pint_us",
  qt: "quart_us",
  quart: "quart_us",
  quarts: "quart_us",
  gal: "gallon_us",
  gallon: "gallon_us",
  gallons: "gallon_us",
};

const TARGET_UNITS = {
  metric: {
    weight: [
      { key: "kg", label: "kg" },
      { key: "g", label: "g" },
    ],
    volume: [
      { key: "l", label: "l" },
      { key: "ml", label: "ml" },
    ],
  },
  us: {
    weight: [
      { key: "lb", label: "lb" },
      { key: "oz", label: "oz" },
    ],
    volume: [
      { key: "cup_us", label: "cup" },
      { key: "floz_us", label: "fl oz" },
      { key: "tbsp_us", label: "tbsp" },
      { key: "tsp_us", label: "tsp" },
    ],
  },
} as const;

function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
  return Math.round(value / step) * step;
}

function roundConvertedAmount(amount: number, unitLabel: string): number {
  const unit = (unitLabel || "").trim().toLowerCase();
  if (unit === "g" || unit === "ml") {
    const abs = Math.abs(amount);
    if (abs >= 5000) return roundToStep(amount, 1000);
    if (abs >= 1000) return roundToStep(amount, 100);
    if (abs >= 100) return roundToStep(amount, 10);
    if (abs >= 20) return roundToStep(amount, 5);
    return roundToStep(amount, 1);
  }
  return amount;
}

export function normalizeUnitKey(unit: string): string {
  const raw = (unit || "").trim().toLowerCase();
  if (!raw) return "";
  const normalized = raw
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .replace(/^us\s+/, "")
    .replace(/\s+us$/, "")
    .trim();
  if (UNIT_ALIASES[normalized]) return UNIT_ALIASES[normalized];
  const compact = normalized.replace(/\s+/g, "");
  return UNIT_ALIASES[compact] || "";
}

function pickTargetUnit(
  baseAmount: number,
  system: UnitSystem,
  dimension: UnitDef["dimension"],
): { key: string; label: string } | null {
  const candidates = TARGET_UNITS[system]?.[dimension];
  if (!candidates?.length) return null;
  for (const candidate of candidates) {
    const def = UNIT_DEFS[candidate.key];
    if (!def) continue;
    const value = baseAmount / def.toBase;
    if (Math.abs(value) >= 1) return candidate;
  }
  return candidates[candidates.length - 1];
}

export interface BaseQuantity {
  amount: number;
  dimension: UnitDef["dimension"];
}

export function toBaseQuantity(amount: number, unit: string): BaseQuantity | null {
  const sourceKey = normalizeUnitKey(unit);
  const sourceDef = UNIT_DEFS[sourceKey];
  if (!sourceDef) return null;
  return {
    amount: amount * sourceDef.toBase,
    dimension: sourceDef.dimension,
  };
}

function convertAmountToSystem(amount: number, unit: string, system: UnitSystem): { amount: number; unit: string } | null {
  const sourceKey = normalizeUnitKey(unit);
  const sourceDef = UNIT_DEFS[sourceKey];
  if (!sourceDef) return null;
  if (system === "us" && sourceDef.dimension === "volume" && /_us$/.test(sourceKey)) {
    const baseAmount = amount * sourceDef.toBase;
    return {
      amount: baseAmount / sourceDef.toBase,
      unit: TARGET_UNITS.us.volume.find((u) => u.key === sourceKey)?.label || unit || "",
    };
  }
  const target = pickTargetUnit(amount * sourceDef.toBase, system, sourceDef.dimension);
  if (!target) return null;
  const targetDef = UNIT_DEFS[target.key];
  if (!targetDef) return null;
  const baseAmount = amount * sourceDef.toBase;
  return {
    amount: baseAmount / targetDef.toBase,
    unit: target.label,
  };
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function formatQuantityNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const whole = Math.floor(abs + 1e-9);
  const fraction = abs - whole;

  if (fraction < 1e-9) {
    return `${sign}${formatNumber(whole)}`;
  }

  let best: { numerator: number; denominator: number; error: number } | null = null;
  for (let denominator = 2; denominator <= 10; denominator += 1) {
    const numerator = Math.round(fraction * denominator);
    const error = Math.abs(fraction - numerator / denominator);
    if (!best || error < best.error) {
      best = { numerator, denominator, error };
    }
  }

  if (!best || best.error > 0.015 || best.numerator === 0) {
    return `${sign}${formatNumber(abs)}`;
  }

  if (best.numerator === best.denominator) {
    return `${sign}${formatNumber(whole + 1)}`;
  }

  const divisor = gcd(best.numerator, best.denominator);
  const numerator = best.numerator / divisor;
  const denominator = best.denominator / divisor;
  if (whole > 0) {
    return `${sign}${whole} ${numerator}/${denominator}`;
  }
  return `${sign}${numerator}/${denominator}`;
}

export function formatScaledAmount(
  amount: number,
  unit: string,
  scaleFactor: number,
  unitSystem: UnitSystem,
  fixed = false,
): string {
  const scaled = amount * (fixed ? 1 : scaleFactor);
  const converted = convertAmountToSystem(scaled, unit, unitSystem);
  if (converted) {
    const roundedAmount = roundConvertedAmount(converted.amount, converted.unit);
    return `${formatQuantityNumber(roundedAmount)}${converted.unit ? ` ${converted.unit}` : ""}`;
  }
  return `${formatQuantityNumber(scaled)}${unit ? ` ${unit}` : ""}`;
}

export function formatScaledIngredient(ingredient: Ingredient, scaleFactor: number, unitSystem: UnitSystem): string {
  if (ingredient.numeric == null) return ingredient.quantityRaw || "";
  return formatScaledAmount(ingredient.numeric, ingredient.unit, scaleFactor, unitSystem, ingredient.fixed);
}

export interface AggregatedIngredientDisplay {
  name: string;
  quantityText: string;
}

interface IngredientGroup {
  name: string;
  weightBase: number;
  volumeBase: number;
  unknownUnits: Map<string, { unitLabel: string; amount: number }>;
  rawQuantities: Set<string>;
}

function formatBaseAmount(baseAmount: number, dimension: UnitDef["dimension"], unitSystem: UnitSystem): string {
  const target = pickTargetUnit(baseAmount, unitSystem, dimension);
  if (!target) {
    return formatNumber(baseAmount);
  }
  const targetDef = UNIT_DEFS[target.key];
  if (!targetDef) {
    return formatNumber(baseAmount);
  }
  const converted = baseAmount / targetDef.toBase;
  const roundedAmount = roundConvertedAmount(converted, target.label);
  return `${formatQuantityNumber(roundedAmount)}${target.label ? ` ${target.label}` : ""}`;
}

export function formatBaseQuantity(baseAmount: number, dimension: "weight" | "volume", unitSystem: UnitSystem): string {
  return formatBaseAmount(baseAmount, dimension, unitSystem);
}

export function aggregateIngredientsForDisplay(
  ingredients: Ingredient[],
  scaleFactor: number,
  unitSystem: UnitSystem,
): AggregatedIngredientDisplay[] {
  const groups = new Map<string, IngredientGroup>();

  for (const ingredient of ingredients) {
    const key = ingredient.name.trim().toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        name: ingredient.name,
        weightBase: 0,
        volumeBase: 0,
        unknownUnits: new Map(),
        rawQuantities: new Set(),
      });
    }
    const group = groups.get(key);
    if (!group) continue;

    if (ingredient.numeric == null) {
      if (ingredient.quantityRaw) {
        group.rawQuantities.add(ingredient.quantityRaw);
      }
      continue;
    }

    const scaled = ingredient.numeric * (ingredient.fixed ? 1 : scaleFactor);
    const base = toBaseQuantity(scaled, ingredient.unit);
    if (base) {
      if (base.dimension === "weight") group.weightBase += base.amount;
      if (base.dimension === "volume") group.volumeBase += base.amount;
      continue;
    }

    const unknownKey = (ingredient.unit || "").trim().toLowerCase();
    const existing = group.unknownUnits.get(unknownKey);
    if (existing) {
      existing.amount += scaled;
    } else {
      group.unknownUnits.set(unknownKey, {
        unitLabel: ingredient.unit || "",
        amount: scaled,
      });
    }
  }

  const output: AggregatedIngredientDisplay[] = [];
  for (const group of groups.values()) {
    const parts: string[] = [];
    if (group.weightBase !== 0) {
      parts.push(formatBaseAmount(group.weightBase, "weight", unitSystem));
    }
    if (group.volumeBase !== 0) {
      parts.push(formatBaseAmount(group.volumeBase, "volume", unitSystem));
    }
    for (const value of group.unknownUnits.values()) {
      parts.push(`${formatQuantityNumber(value.amount)}${value.unitLabel ? ` ${value.unitLabel}` : ""}`);
    }
    for (const raw of group.rawQuantities.values()) {
      parts.push(raw);
    }

    output.push({
      name: group.name,
      quantityText: parts.join(" + ") || "-",
    });
  }

  return output;
}
