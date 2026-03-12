/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchBackendConfig,
  fetchBackendHealth,
  fetchBackendMealPlan,
  fetchBackendRecipes,
  fetchBackendShoppingPlan,
  saveBackendConfig,
  saveBackendMealPlan,
} from "../src/lib/api";

describe("api helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends json headers and request bodies to backend endpoints", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchBackendHealth();
    await fetchBackendConfig();
    await fetchBackendRecipes();
    await fetchBackendMealPlan();
    await fetchBackendShoppingPlan();
    await saveBackendConfig({
      mode: "local-http",
      githubOwner: "",
      githubRepo: "",
      githubRef: "main",
      recipesPath: "recipes/",
      aislePath: "aisle.conf",
      pantryPath: "pantry.conf",
      defaultUnitSystem: "metric",
    });
    await saveBackendMealPlan({ startDateIso: "2026-03-09", days: [] });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/health",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/config",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining('"mode":"local-http"'),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "/api/meal-plan",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ startDateIso: "2026-03-09", days: [] }),
      }),
    );
  });

  it("throws when the backend returns a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 503 })));

    await expect(fetchBackendRecipes()).rejects.toThrow("Request failed: 503");
  });
});
