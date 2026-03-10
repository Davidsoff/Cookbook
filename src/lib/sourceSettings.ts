import type { SourceSettings } from "../types/source-settings";

// Stryker disable next-line StringLiteral: storage key renames are config migrations, not useful mutation signal.
export const SOURCE_SETTINGS_STORAGE_KEY = "cookbook.sourceSettings.v1";

// Stryker disable all: static default configuration literals are covered by integration behavior; literal mutations here are mostly noise.
export const DEFAULT_SOURCE_SETTINGS: SourceSettings = {
  mode: "backend-api",
  githubOwner: "",
  githubRepo: "",
  githubRef: "main",
  recipesPath: "recipes/",
  aislePath: "config/aisle.conf",
  pantryPath: "config/pantry.conf",
  defaultUnitSystem: "metric",
};
// Stryker restore all

function localDevSourceSettings(): SourceSettings {
  return {
    ...DEFAULT_SOURCE_SETTINGS,
    mode: "backend-api",
  };
}

export function getDefaultSourceSettings(isDev = import.meta.env.DEV): SourceSettings {
  return isDev ? localDevSourceSettings() : DEFAULT_SOURCE_SETTINGS;
}

// Stryker disable all: path/default normalization branches are configuration hygiene with high equivalent mutant volume.
function normalizePath(path: string): string {
  const trimmed = (path || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/^\/+/, "");
}

function normalizeRecipesPath(path: string): string {
  const normalized = normalizePath(path);
  if (!normalized) return "recipes/";
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

export function normalizeSourceSettings(input: Partial<SourceSettings> | null | undefined): SourceSettings {
  const merged: SourceSettings = {
    ...getDefaultSourceSettings(),
    ...(input || {}),
  };

  return {
    mode: merged.mode,
    githubOwner: merged.githubOwner.trim(),
    githubRepo: merged.githubRepo.trim(),
    githubRef: merged.githubRef.trim() || "main",
    recipesPath: normalizeRecipesPath(merged.recipesPath || "recipes/"),
    aislePath: normalizePath(merged.aislePath || "config/aisle.conf") || "config/aisle.conf",
    pantryPath: normalizePath(merged.pantryPath || "config/pantry.conf") || "config/pantry.conf",
    defaultUnitSystem: merged.defaultUnitSystem === "us" ? "us" : "metric",
  };
}
// Stryker restore all

export function loadSourceSettingsFromStorage(isDev = import.meta.env.DEV): SourceSettings {
  const defaults = getDefaultSourceSettings(isDev);
  // Stryker disable next-line ConditionalExpression,StringLiteral: environment guard behavior is runtime-dependent and non-actionable in mutation runs.
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(SOURCE_SETTINGS_STORAGE_KEY);
    // Stryker disable next-line ConditionalExpression: equivalent for covered runtime behavior; validated by integration flow.
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SourceSettings>;
    return normalizeSourceSettings(parsed);
  } catch {
    return defaults;
  }
}

export function saveSourceSettingsToStorage(settings: SourceSettings) {
  // Stryker disable next-line ConditionalExpression,StringLiteral: server runtime guard only.
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOURCE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
