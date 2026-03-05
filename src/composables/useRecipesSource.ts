import { hashText } from "../lib/hash";
import type { Recipe } from "../types/recipe";
import { adaptRawRecipeFile, adaptRawRecipeFiles } from "../lib/recipeAdapter";
import { parseAisleConfig, parsePantryConfig } from "../lib/shopping";
import type { ShoppingConfig } from "../types/shopping";

const DEFAULT_RECIPES_PATH = "recipes/";
const POLL_INTERVAL_MS = 3000;

function looksLikeSpaIndex(html: string): boolean {
  return html.includes("<div id=\"app\"></div>") && html.includes("/src/main.ts");
}

function extractLinksFromDirectoryListing(html: string): string[] {
  const links: string[] = [];
  const hrefPattern = /href="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(html)) !== null) {
    const href = match[1];
    if (!href || href === "../") continue;
    links.push(href);
  }
  return links;
}

function buildRecipesFingerprint(recipes: Recipe[]): string {
  return recipes
    .map((recipe) => `${recipe.path}:${hashText(recipe.content)}`)
    .sort()
    .join("|");
}

function buildShoppingConfigFingerprint(config: ShoppingConfig): string {
  return JSON.stringify(config);
}

async function fetchRecipesFromHttpDirectory(basePath = DEFAULT_RECIPES_PATH): Promise<Recipe[]> {
  const recipes: Recipe[] = [];
  const queue = [basePath.replace(/\/?$/, "/")];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const dirPath = queue.shift();
    if (!dirPath || seen.has(dirPath)) continue;
    seen.add(dirPath);

    let res: Response;
    try {
      res = await fetch(dirPath, { cache: "no-store" });
    } catch {
      continue;
    }

    if (!res.ok) continue;

    const html = await res.text();
    if (looksLikeSpaIndex(html)) {
      return [];
    }

    const links = extractLinksFromDirectoryListing(html);

    for (const rawHref of links) {
      let href: string;
      try {
        href = decodeURIComponent(rawHref);
      } catch {
        href = rawHref;
      }

      if (href.startsWith("?") || href.startsWith("#")) continue;

      if (href.endsWith("/")) {
        const nested = new URL(href, new URL(dirPath, window.location.href));
        const nestedPath = nested.pathname.replace(/^\//, "");
        if (!nestedPath.startsWith(DEFAULT_RECIPES_PATH)) continue;
        queue.push(nestedPath);
        continue;
      }

      if (!href.toLowerCase().endsWith(".cook")) continue;

      const fileUrl = new URL(href, new URL(dirPath, window.location.href));
      const path = fileUrl.pathname.replace(/^\//, "");

      let fileRes: Response;
      try {
        fileRes = await fetch(fileUrl.toString(), { cache: "no-store" });
      } catch {
        continue;
      }
      if (!fileRes.ok) continue;

      const content = await fileRes.text();
      recipes.push(adaptRawRecipeFile({ path, content }));
    }
  }

  return recipes;
}

async function loadRecipesFromViteGlob(): Promise<Recipe[]> {
  const loaders = import.meta.glob<string>("/recipes/**/*.cook", {
    query: "?raw",
    import: "default",
  });
  const entries = await Promise.all(
    Object.entries(loaders).map(async ([filePath, load]) => {
      const content = await load();
      const path = filePath.replace(/^\//, "");
      return { path, content };
    }),
  );
  return adaptRawRecipeFiles(entries).sort((a, b) => a.path.localeCompare(b.path));
}

interface UseRecipesSourceOptions {
  onData: (data: { recipes: Recipe[]; shoppingConfig: ShoppingConfig }) => void;
}

export function useRecipesSource(options: UseRecipesSourceOptions) {
  let pollId: number | null = null;
  let fingerprint = "";

  async function fetchOptionalText(paths: string[]): Promise<string> {
    for (const path of paths) {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (!res.ok) continue;
        return await res.text();
      } catch {
        continue;
      }
    }
    return "";
  }

  async function loadShoppingConfig(): Promise<ShoppingConfig> {
    const aisleRaw = await fetchOptionalText(["config/aisle.conf", "aisle.conf", "shopping/aisle.conf"]);
    const pantryRaw = await fetchOptionalText(["config/pantry.conf", "pantry.conf", "shopping/pantry.conf"]);
    return {
      aisleByIngredient: parseAisleConfig(aisleRaw),
      pantryByIngredient: parsePantryConfig(pantryRaw),
    };
  }

  async function refresh(force = false): Promise<void> {
    let recipes = await fetchRecipesFromHttpDirectory(DEFAULT_RECIPES_PATH);
    if (recipes.length === 0 && import.meta.env.DEV) {
      recipes = await loadRecipesFromViteGlob();
    }
    const shoppingConfig = await loadShoppingConfig();
    recipes.sort((a, b) => a.path.localeCompare(b.path));
    const nextFingerprint = `${buildRecipesFingerprint(recipes)}::${buildShoppingConfigFingerprint(shoppingConfig)}`;

    if (!force && nextFingerprint === fingerprint) {
      return;
    }

    fingerprint = nextFingerprint;
    options.onData({ recipes, shoppingConfig });
  }

  function startPolling() {
    stopPolling();
    pollId = window.setInterval(() => {
      refresh(false).catch(console.error);
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollId != null) {
      window.clearInterval(pollId);
      pollId = null;
    }
  }

  function handleVisibilityOrFocus() {
    if (!document.hidden) {
      refresh(false).catch(console.error);
    }
  }

  function start() {
    refresh(true).catch(console.error);
    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
  }

  function stop() {
    stopPolling();
    document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    window.removeEventListener("focus", handleVisibilityOrFocus);
  }

  return {
    start,
    stop,
    refresh,
  };
}
