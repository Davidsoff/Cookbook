import { describe, expect, it } from "vitest";
import { buildRecipeTree } from "../src/lib/tree";
import type { Recipe } from "../src/types/recipe";

function makeRecipe(path: string): Recipe {
  return {
    name: path.split("/").pop()?.replace(/\.cook$/i, "") || path,
    path,
    content: "",
    parsed: {
      title: "",
      description: "",
      image: "",
      servingsBase: 1,
      ingredients: [],
      tools: [],
      steps: [],
    },
  };
}

describe("buildRecipeTree", () => {
  it("builds nested folders and root-level recipes", () => {
    const recipes = [
      makeRecipe("recipes/Root.cook"),
      makeRecipe("recipes/dinner/pasta/Carbonara.cook"),
      makeRecipe("recipes/dinner/soup/Tomato.cook"),
      makeRecipe("recipes/breakfast/Omelette.cook"),
    ];

    const tree = buildRecipeTree(recipes);

    expect(tree.root.recipes).toHaveLength(1);
    expect(tree.root.recipes[0].path).toBe("recipes/Root.cook");
    expect(tree.root.folders.map((folder) => folder.name)).toEqual(["breakfast", "dinner"]);

    const dinner = tree.root.folders.find((folder) => folder.name === "dinner");
    expect(dinner?.folders.map((folder) => folder.name)).toEqual(["pasta", "soup"]);

    expect(tree.pathToRecipeIndex["recipes/dinner/pasta/Carbonara.cook"]).toBe(1);
  });
});
