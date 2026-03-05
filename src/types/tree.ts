export interface TreeRecipeNode {
  name: string;
  path: string;
  recipeIndex: number;
}

export interface TreeFolderNode {
  name: string;
  path: string;
  folders: TreeFolderNode[];
  recipes: TreeRecipeNode[];
}

export interface TreeBuildResult {
  root: TreeFolderNode;
  pathToRecipeIndex: Record<string, number>;
}
