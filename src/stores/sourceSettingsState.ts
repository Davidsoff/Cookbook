import {
  getDefaultSourceSettings,
  loadSourceSettingsFromStorage,
  normalizeSourceSettings,
  saveSourceSettingsToStorage,
} from "../lib/sourceSettings";
import type { UnitSystem } from "../types/recipe";
import type { SourceSettings } from "../types/source-settings";

export interface SourceSettingsState {
  sourceSettings: SourceSettings;
  unitSystem: UnitSystem;
}

export function loadPersistedSourceSettingsState(): SourceSettingsState {
  const sourceSettings = loadSourceSettingsFromStorage();
  return {
    sourceSettings,
    unitSystem: sourceSettings.defaultUnitSystem,
  };
}

export function mergeSourceSettings(current: SourceSettings, next: Partial<SourceSettings>): SourceSettings {
  return normalizeSourceSettings({ ...current, ...next });
}

export function persistSourceSettings(next: SourceSettings): SourceSettingsState {
  const sourceSettings = normalizeSourceSettings(next);
  saveSourceSettingsToStorage(sourceSettings);
  return {
    sourceSettings,
    unitSystem: sourceSettings.defaultUnitSystem,
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
  return persistSourceSettings({
    ...current,
    defaultUnitSystem: unitSystem,
  });
}
