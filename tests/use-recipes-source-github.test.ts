/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecipesSource } from "../src/composables/useRecipesSource";
import type { SourceSettings } from "../src/types/source-settings";

const githubSettings: SourceSettings = {
  mode: "github-public",
  githubOwner: "demo",
  githubRepo: "cookbook",
  githubRef: "main",
  recipesPath: "recipes/",
  aislePath: "config/aisle.conf",
  pantryPath: "config/pantry.conf",
  defaultUnitSystem: "metric",
};

describe("useRecipesSource github", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads recipes and shopping config from public github", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/git/trees/")) {
        return new Response(
          JSON.stringify({
            tree: [
              { path: "recipes/a.cook", type: "blob" },
              { path: "recipes/folder/b.cook", type: "blob" },
              { path: "config/aisle.conf", type: "blob" },
              { path: "config/pantry.conf", type: "blob" },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.endsWith("/recipes/a.cook")) {
        return new Response("A\n\n@mint{0.25%cup}", { status: 200 });
      }

      if (url.endsWith("/recipes/folder/b.cook")) {
        return new Response("B\n\n@salt{1%tsp}", { status: 200 });
      }

      if (url.endsWith("/config/aisle.conf")) {
        return new Response("[Herbs]\nmint\n[Spices]\nsalt", { status: 200 });
      }

      if (url.endsWith("/config/pantry.conf")) {
        return new Response('salt = "5 g"', { status: 200 });
      }

      return new Response("", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const onData = vi.fn();
    const source = useRecipesSource({
      getSettings: () => githubSettings,
      onData,
    });

    await source.refresh(true);

    expect(onData).toHaveBeenCalledTimes(1);
    const payload = onData.mock.calls[0][0];
    expect(payload.recipes.map((recipe: { path: string }) => recipe.path)).toEqual([
      "recipes/a.cook",
      "recipes/folder/b.cook",
    ]);
    expect(payload.shoppingConfig.aisleByIngredient.mint).toBe("Herbs");
    expect(payload.shoppingConfig.pantryByIngredient.salt.amount).toBe(5);
  });
});
