/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SOURCE_SETTINGS,
  SOURCE_SETTINGS_STORAGE_KEY,
  getDefaultSourceSettings,
  loadSourceSettingsFromStorage,
  normalizeSourceSettings,
  saveSourceSettingsToStorage,
} from "../src/lib/sourceSettings";

describe("source settings", () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => {
          data.set(key, value);
        },
        removeItem: (key: string) => {
          data.delete(key);
        },
        clear: () => {
          data.clear();
        },
      },
      configurable: true,
    });
  });

  it("normalizes paths and default unit system", () => {
    const normalized = normalizeSourceSettings({
      mode: "github-public",
      githubOwner: " user ",
      githubRepo: " repo ",
      githubRef: " ",
      recipesPath: "recipes",
      aislePath: "/config/aisle.conf",
      pantryPath: " /config/pantry.conf ",
      defaultUnitSystem: "us",
    });

    expect(normalized.githubOwner).toBe("user");
    expect(normalized.githubRepo).toBe("repo");
    expect(normalized.githubRef).toBe("main");
    expect(normalized.recipesPath).toBe("recipes/");
    expect(normalized.aislePath).toBe("config/aisle.conf");
    expect(normalized.pantryPath).toBe("config/pantry.conf");
    expect(normalized.defaultUnitSystem).toBe("us");
  });

  it("defaults to shared backend mode", () => {
    expect(DEFAULT_SOURCE_SETTINGS.mode).toBe("backend-api");
    expect(DEFAULT_SOURCE_SETTINGS.githubOwner).toBe("");
    expect(DEFAULT_SOURCE_SETTINGS.githubRepo).toBe("");
    expect(DEFAULT_SOURCE_SETTINGS.githubRef).toBe("main");
  });

  it("uses backend-api as the runtime default", () => {
    expect(getDefaultSourceSettings(true).mode).toBe("backend-api");
    expect(getDefaultSourceSettings(false).mode).toBe("backend-api");
  });

  it("loads defaults on invalid stored payload", () => {
    window.localStorage.setItem(SOURCE_SETTINGS_STORAGE_KEY, "{broken");
    expect(loadSourceSettingsFromStorage(false)).toEqual(DEFAULT_SOURCE_SETTINGS);
    expect(loadSourceSettingsFromStorage(true).mode).toBe("backend-api");
  });

  it("saves and loads normalized settings", () => {
    saveSourceSettingsToStorage(
      normalizeSourceSettings({
        mode: "github-public",
        githubOwner: "owner",
        githubRepo: "recipes",
        githubRef: "main",
        recipesPath: "nested",
        aislePath: "configs/aisle.conf",
        pantryPath: "configs/pantry.conf",
        defaultUnitSystem: "metric",
      }),
    );

    const loaded = loadSourceSettingsFromStorage();
    expect(loaded.mode).toBe("github-public");
    expect(loaded.recipesPath).toBe("nested/");
    expect(loaded.aislePath).toBe("configs/aisle.conf");
    expect(loaded.pantryPath).toBe("configs/pantry.conf");
    expect(loaded.defaultUnitSystem).toBe("metric");
  });
});
