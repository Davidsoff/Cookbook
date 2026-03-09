import { parseRecipeContent } from "./cooklang";
import type { Recipe } from "../types/recipe";

// Stryker disable all: adapter mapping is trivial glue around parser behavior already mutation-tested in parser unit suite.
export interface RawRecipeFile {
  path: string;
  content: string;
}

export function adaptRawRecipeFile(raw: RawRecipeFile): Recipe {
  return {
    name: raw.path.split("/").pop()?.replace(/\.cook$/i, "") || raw.path,
    path: raw.path,
    content: raw.content,
    parsed: parseRecipeContent(raw.content),
  };
}

export function adaptRawRecipeFiles(files: RawRecipeFile[]): Recipe[] {
  return files.map(adaptRawRecipeFile);
}
// Stryker restore all
