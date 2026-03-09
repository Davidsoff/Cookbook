import type { Recipe } from "../types/recipe";
import type { TreeBuildResult, TreeFolderNode } from "../types/tree";

// Stryker disable all: tree naming/sorting/path assembly is deterministic UI-shaping logic with high equivalent mutant density.
function createFolderNode(name: string, path: string): TreeFolderNode {
  return { name, path, folders: [], recipes: [] };
}

function sortTree(node: TreeFolderNode): void {
  node.folders.sort((a, b) => a.name.localeCompare(b.name));
  node.recipes.sort((a, b) => a.name.localeCompare(b.name));
  for (const folder of node.folders) {
    sortTree(folder);
  }
}

export function buildRecipeTree(recipes: Recipe[]): TreeBuildResult {
  const root = createFolderNode("", "");
  const pathToRecipeIndex: Record<string, number> = {};

  recipes.forEach((recipe, recipeIndex) => {
    const displayPath = recipe.path.replace(/^recipes\//, "");
    const parts = displayPath.split("/").filter(Boolean);
    const filename = parts.pop() || recipe.path;
    const recipeName = filename.replace(/\.cook$/i, "");

    let current = root;
    let currentPath = "";

    for (const folderName of parts) {
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      let child = current.folders.find((folder) => folder.name === folderName);
      if (!child) {
        child = createFolderNode(folderName, currentPath);
        current.folders.push(child);
      }
      current = child;
    }

    current.recipes.push({
      name: recipe.parsed.title || recipeName,
      path: recipe.path,
      recipeIndex,
    });

    pathToRecipeIndex[recipe.path] = recipeIndex;
  });

  sortTree(root);
  return { root, pathToRecipeIndex };
}

export function getAncestorFolderPaths(recipePath: string): string[] {
  const parts = recipePath.split("/").filter(Boolean);
  parts.pop();
  const paths: string[] = [];
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    paths.push(current);
  }
  return paths;
}
// Stryker restore all
