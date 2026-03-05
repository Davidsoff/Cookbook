import type { SourceSettings } from "../types/source-settings";

export const SOURCE_SETTINGS_STORAGE_KEY = "cookbook.sourceSettings.v1";

export const DEFAULT_SOURCE_SETTINGS: SourceSettings = {
  mode: "local-http",
  githubOwner: "",
  githubRepo: "",
  githubRef: "main",
  recipesPath: "recipes/",
  aislePath: "config/aisle.conf",
  pantryPath: "config/pantry.conf",
  defaultUnitSystem: "metric",
};

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
    ...DEFAULT_SOURCE_SETTINGS,
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

export function loadSourceSettingsFromStorage(): SourceSettings {
  if (typeof window === "undefined") return DEFAULT_SOURCE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SOURCE_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SOURCE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SourceSettings>;
    return normalizeSourceSettings(parsed);
  } catch {
    return DEFAULT_SOURCE_SETTINGS;
  }
}

export function saveSourceSettingsToStorage(settings: SourceSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOURCE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
