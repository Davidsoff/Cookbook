import { hashText } from "../lib/hash";
import type { Recipe } from "../types/recipe";
import { adaptRawRecipeFile, adaptRawRecipeFiles } from "../lib/recipeAdapter";
import { parseAisleConfig, parsePantryConfig } from "../lib/shopping";
import type { ShoppingConfig } from "../types/shopping";
import type { SourceSettings } from "../types/source-settings";
import { getDefaultSourceSettings, normalizeSourceSettings } from "../lib/sourceSettings";

const DEFAULT_RECIPES_PATH = "recipes/";
const POLL_INTERVAL_MS = 3000;

function looksLikeSpaIndex(html: string): boolean {
  return html.includes('<div id="app"></div>') && html.includes("/src/main.ts");
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}

function normalizeRelativePath(path: string): string {
  return (path || "").replace(/^\/+/, "").trim();
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

async function fetchRecipesFromHttpDirectory(basePath: string): Promise<Recipe[]> {
  const normalizedBase = ensureTrailingSlash(normalizeRelativePath(basePath || DEFAULT_RECIPES_PATH) || DEFAULT_RECIPES_PATH);
  const recipes: Recipe[] = [];
  const queue = [normalizedBase];
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
        const nestedPath = normalizeRelativePath(nested.pathname);
        if (!nestedPath.startsWith(normalizedBase)) continue;
        queue.push(nestedPath);
        continue;
      }

      if (!href.toLowerCase().endsWith(".cook")) continue;

      const fileUrl = new URL(href, new URL(dirPath, window.location.href));
      const path = normalizeRelativePath(fileUrl.pathname);

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

function encodePath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function githubRawUrl(settings: SourceSettings, path: string): string {
  const owner = encodeURIComponent(settings.githubOwner);
  const repo = encodeURIComponent(settings.githubRepo);
  const ref = encodeURIComponent(settings.githubRef);
  const encodedPath = encodePath(normalizeRelativePath(path));
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${encodedPath}`;
}

interface GithubTreeItem {
  path: string;
  type: string;
}

interface GithubTreeResponse {
  tree?: GithubTreeItem[];
}

async function fetchGithubTree(settings: SourceSettings): Promise<GithubTreeItem[]> {
  const owner = encodeURIComponent(settings.githubOwner);
  const repo = encodeURIComponent(settings.githubRepo);
  const ref = encodeURIComponent(settings.githubRef);
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;

  try {
    const res = await fetch(treeUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as GithubTreeResponse;
    if (!Array.isArray(data.tree)) return [];
    return data.tree.filter((item) => item && typeof item.path === "string" && typeof item.type === "string");
  } catch {
    return [];
  }
}

async function fetchGithubText(settings: SourceSettings, path: string): Promise<string> {
  if (!normalizeRelativePath(path)) return "";
  try {
    const res = await fetch(githubRawUrl(settings, path), { cache: "no-store" });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

async function fetchRecipesFromGithub(settings: SourceSettings): Promise<Recipe[]> {
  if (!settings.githubOwner || !settings.githubRepo) return [];

  const tree = await fetchGithubTree(settings);
  if (tree.length === 0) return [];

  const root = ensureTrailingSlash(normalizeRelativePath(settings.recipesPath || DEFAULT_RECIPES_PATH) || DEFAULT_RECIPES_PATH);
  const paths = tree
    .filter((item) => item.type === "blob")
    .map((item) => normalizeRelativePath(item.path))
    .filter((path) => path.startsWith(root) && path.toLowerCase().endsWith(".cook"))
    .sort((a, b) => a.localeCompare(b));

  const recipes = await Promise.all(
    paths.map(async (path) => {
      const content = await fetchGithubText(settings, path);
      if (!content) return null;
      return adaptRawRecipeFile({ path, content });
    }),
  );

  return recipes.filter((item): item is Recipe => item != null);
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
  getSettings?: () => SourceSettings;
}

export function useRecipesSource(options: UseRecipesSourceOptions) {
  let pollId: number | null = null;
  let fingerprint = "";

  function getSettings(): SourceSettings {
    const raw = options.getSettings?.() ?? getDefaultSourceSettings();
    return normalizeSourceSettings(raw);
  }

  async function fetchOptionalLocalText(paths: string[]): Promise<string> {
    for (const path of paths) {
      const normalized = normalizeRelativePath(path);
      if (!normalized) continue;

      try {
        const res = await fetch(normalized, { cache: "no-store" });
        if (!res.ok) continue;
        return await res.text();
      } catch {
        continue;
      }
    }
    return "";
  }

  async function loadShoppingConfig(settings: SourceSettings): Promise<ShoppingConfig> {
    if (settings.mode === "github-public" && (!settings.githubOwner || !settings.githubRepo)) {
      return { aisleByIngredient: {}, pantryByIngredient: {} };
    }

    const aisleCandidates = [settings.aislePath, "config/aisle.conf", "aisle.conf", "shopping/aisle.conf"];
    const pantryCandidates = [settings.pantryPath, "config/pantry.conf", "pantry.conf", "shopping/pantry.conf"];

    const aisleRaw =
      settings.mode === "github-public"
        ? await (async () => {
            for (const path of aisleCandidates) {
              const raw = await fetchGithubText(settings, path);
              if (raw) return raw;
            }
            return "";
          })()
        : await fetchOptionalLocalText(aisleCandidates);

    const pantryRaw =
      settings.mode === "github-public"
        ? await (async () => {
            for (const path of pantryCandidates) {
              const raw = await fetchGithubText(settings, path);
              if (raw) return raw;
            }
            return "";
          })()
        : await fetchOptionalLocalText(pantryCandidates);

    return {
      aisleByIngredient: parseAisleConfig(aisleRaw),
      pantryByIngredient: parsePantryConfig(pantryRaw),
    };
  }

  async function refresh(force = false): Promise<void> {
    const settings = getSettings();

    let recipes: Recipe[] =
      settings.mode === "github-public"
        ? await fetchRecipesFromGithub(settings)
        : await fetchRecipesFromHttpDirectory(settings.recipesPath);

    if (
      recipes.length === 0 &&
      import.meta.env.DEV &&
      settings.mode === "local-http" &&
      settings.recipesPath === DEFAULT_RECIPES_PATH
    ) {
      recipes = await loadRecipesFromViteGlob();
    }

    const shoppingConfig = await loadShoppingConfig(settings);
    recipes.sort((a, b) => a.path.localeCompare(b.path));

    const nextFingerprint = `${JSON.stringify(settings)}::${buildRecipesFingerprint(recipes)}::${buildShoppingConfigFingerprint(shoppingConfig)}`;

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
