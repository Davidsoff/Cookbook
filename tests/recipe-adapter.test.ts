import { describe, expect, it } from "vitest";
import { adaptRawRecipeFile, adaptRawRecipeFiles } from "../src/lib/recipeAdapter";

describe("recipeAdapter", () => {
  it("derives recipe metadata from raw files", () => {
    const recipe = adaptRawRecipeFile({
      path: "recipes/dinner/pasta.cook",
      content: "---\ntitle: Pasta\nservings: 4\n---\n@tomato{2}",
    });

    expect(recipe.name).toBe("pasta");
    expect(recipe.path).toBe("recipes/dinner/pasta.cook");
    expect(recipe.parsed.title).toBe("Pasta");
    expect(recipe.parsed.servingsBase).toBe(4);
  });

  it("maps file arrays through the single-file adapter", () => {
    const recipes = adaptRawRecipeFiles([
      { path: "recipes/a.cook", content: "@salt{1%tsp}" },
      { path: "recipes/b.cook", content: "@pepper{1%tsp}" },
    ]);

    expect(recipes.map((recipe) => recipe.name)).toEqual(["a", "b"]);
  });
});
