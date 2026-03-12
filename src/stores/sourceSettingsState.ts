import {
  clearUnitSystemOverrideFromStorage,
  getDefaultSourceSettings,
  loadSourceSettingsFromStorage,
  loadUnitSystemOverrideFromStorage,
  normalizeSourceSettings,
  saveSourceSettingsToStorage,
  saveUnitSystemOverrideToStorage,
} from "../lib/sourceSettings";
import type { UnitSystem } from "../types/recipe";
import type { SourceSettings } from "../types/source-settings";

export interface SourceSettingsState {
  sourceSettings: SourceSettings;
  unitSystem: UnitSystem;
}

export function loadPersistedSourceSettingsState(): SourceSettingsState {
  const sourceSettings = loadSourceSettingsFromStorage();
  const unitSystemOverride = loadUnitSystemOverrideFromStorage();

  return {
    sourceSettings,
    unitSystem: unitSystemOverride ?? sourceSettings.defaultUnitSystem,
  };
}

export function mergeSourceSettings(current: SourceSettings, next: Partial<SourceSettings>): SourceSettings {
  return normalizeSourceSettings({ ...current, ...next });
}

export function persistSourceSettings(next: SourceSettings): SourceSettingsState {
  const sourceSettings = normalizeSourceSettings(next);
  const unitSystemOverride = loadUnitSystemOverrideFromStorage();
  saveSourceSettingsToStorage(sourceSettings);
  return {
    sourceSettings,
    unitSystem: unitSystemOverride ?? sourceSettings.defaultUnitSystem,
  };
}

export function persistMergedSourceSettings(
  current: SourceSettings,
  next: Partial<SourceSettings>,
): SourceSettingsState {
  return persistSourceSettings(mergeSourceSettings(current, next));
}

export function resetPersistedSourceSettings(): SourceSettingsState {
  return persistSourceSettings(getDefaultSourceSettings());
}

export function persistUnitSystem(
  current: SourceSettings,
  unitSystem: UnitSystem,
): SourceSettingsState {
  saveUnitSystemOverrideToStorage(unitSystem);
  return {
    sourceSettings: current,
    unitSystem,
  };
}

export function clearPersistedUnitSystemOverride(current: SourceSettings): SourceSettingsState {
  clearUnitSystemOverrideFromStorage();
  return {
    sourceSettings: current,
    unitSystem: current.defaultUnitSystem,
  };
}
