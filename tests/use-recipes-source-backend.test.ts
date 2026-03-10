/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecipesSource } from "../src/composables/useRecipesSource";
import type { SourceSettings } from "../src/types/source-settings";

const backendSettings: SourceSettings = {
  mode: "backend-api",
  githubOwner: "",
  githubRepo: "",
  githubRef: "main",
  recipesPath: "recipes/",
  aislePath: "config/aisle.conf",
  pantryPath: "config/pantry.conf",
  defaultUnitSystem: "metric",
};

describe("useRecipesSource backend-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads recipes and shared config from the backend api", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/api/health")) {
        return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
      }

      if (url.endsWith("/api/config")) {
        return new Response(
          JSON.stringify({
            sourceSettings: backendSettings,
            shoppingConfig: {
              aisleByIngredient: { mint: "Herbs" },
              pantryByIngredient: { salt: { amount: 5, unit: "g" } },
            },
          }),
          { status: 200 },
        );
      }

      if (url.endsWith("/api/recipes")) {
        return new Response(
          JSON.stringify({
            recipes: [
              {
                id: "a",
                path: "recipes/a.cook",
                name: "a",
                content: "---\ntitle: A\n---\n@mint{1%cup}",
                title: "A",
                description: "",
                image: "",
                servingsBase: 1,
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response("", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const onData = vi.fn();
    const onStatus = vi.fn();
    const source = useRecipesSource({
      getSettings: () => backendSettings,
      onData,
      onStatus,
    });

    const result = await source.refresh(true);

    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData.mock.calls[0][0].sourceSettings.mode).toBe("backend-api");
    expect(onData.mock.calls[0][0].recipes[0].path).toBe("recipes/a.cook");
    expect(onData.mock.calls[0][0].shoppingConfig.aisleByIngredient.mint).toBe("Herbs");
    expect(result.snapshot?.sourceSettings.mode).toBe("backend-api");
    expect(result.updated).toBe(true);
    expect(result.error).toBeNull();
    expect(onStatus).toHaveBeenLastCalledWith({ backendAvailable: true, message: "" });
  });
});
