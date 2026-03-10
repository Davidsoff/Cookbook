import { hashText } from "../lib/hash";
import type { Recipe } from "../types/recipe";
import { adaptRawRecipeFile, adaptRawRecipeFiles } from "../lib/recipeAdapter";
import { parseAisleConfig, parsePantryConfig } from "../lib/shopping";
import type { ShoppingConfig } from "../types/shopping";
import type { SourceSettings } from "../types/source-settings";
import { fetchBackendConfig, fetchBackendHealth, fetchBackendRecipes } from "../lib/api";
import { getDefaultSourceSettings, normalizeSourceSettings } from "../lib/sourceSettings";
import type { BackendRecipeDto } from "../types/api";

const DEFAULT_RECIPES_PATH = "recipes/";
const POLL_INTERVAL_MS = 3000;
const EMPTY_SHOPPING_CONFIG: ShoppingConfig = { aisleByIngredient: {}, pantryByIngredient: {} };

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
    .sort((left, right) => left.localeCompare(right))
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
      throw new SourceAccessError(`Could not fetch recipe directory: ${dirPath}`);
    }

    if (!res.ok) {
      if (dirPath === normalizedBase) {
        throw new SourceAccessError(`Recipe directory returned ${res.status}: ${dirPath}`);
      }
      continue;
    }

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

      const content = await fetchRequiredText(fileUrl.toString(), "recipe file", path);
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
    if (!res.ok) {
      throw new SourceAccessError(`GitHub tree request failed with ${res.status}`);
    }
    const data = (await res.json()) as GithubTreeResponse;
    if (!Array.isArray(data.tree)) {
      throw new SourceAccessError("GitHub tree response did not contain a tree");
    }
    return data.tree.filter((item) => item && typeof item.path === "string" && typeof item.type === "string");
  } catch {
    throw new SourceAccessError("Could not load recipe tree from GitHub");
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
    paths.map(async (path) => adaptRawRecipeFile({ path, content: await fetchRequiredGithubText(settings, path, "GitHub recipe file") })),
  );

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
  onData: (data: SourceSnapshot) => void;
  getSettings?: () => SourceSettings;
  onStatus?: (status: { backendAvailable: boolean; message: string }) => void;
}

export interface SourceSnapshot {
  recipes: Recipe[];
  shoppingConfig: ShoppingConfig;
  sourceSettings: SourceSettings;
}

export interface SourceRefreshResult {
  snapshot: SourceSnapshot | null;
  status: { backendAvailable: boolean; message: string };
  updated: boolean;
  error: Error | null;
}

interface TextFetchResult {
  kind: "ok" | "missing" | "error";
  text?: string;
  error?: SourceAccessError;
}

class SourceAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceAccessError";
  }
}

function getSourceSettings(options: UseRecipesSourceOptions): SourceSettings {
  const raw = options.getSettings?.() ?? getDefaultSourceSettings();
  return normalizeSourceSettings(raw);
}

function createSuccessStatus() {
  return { backendAvailable: true, message: "" };
}

function createFailureStatus(error: unknown) {
  return {
    backendAvailable: false,
    message: error instanceof Error ? error.message : "Source unavailable",
  };
}

function buildSourceFingerprint(snapshot: SourceSnapshot): string {
  return `${JSON.stringify(snapshot.sourceSettings)}::${buildRecipesFingerprint(snapshot.recipes)}::${buildShoppingConfigFingerprint(snapshot.shoppingConfig)}`;
}

async function fetchTextResult(url: string, label: string): Promise<TextFetchResult> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 404) {
      return { kind: "missing" };
    }
    if (!res.ok) {
      return {
        kind: "error",
        error: new SourceAccessError(`${label} returned ${res.status}: ${url}`),
      };
    }
    return { kind: "ok", text: await res.text() };
  } catch {
    return {
      kind: "error",
      error: new SourceAccessError(`Could not fetch ${label}: ${url}`),
    };
  }
}

async function fetchRequiredText(url: string, label: string, path: string): Promise<string> {
  const result = await fetchTextResult(url, label);
  if (result.kind === "ok") {
    return result.text ?? "";
  }
  if (result.kind === "missing") {
    throw new SourceAccessError(`${label} not found: ${path}`);
  }
  throw result.error ?? new SourceAccessError(`Could not fetch ${label}: ${path}`);
}

async function fetchLocalTextResult(path: string, label: string): Promise<TextFetchResult> {
  const normalized = normalizeRelativePath(path);
  if (!normalized) {
    return { kind: "missing" };
  }

  return fetchTextResult(normalized, label);
}

async function fetchOptionalLocalText(paths: string[], label: string): Promise<string> {
  let firstError: SourceAccessError | null = null;

  for (const path of paths) {
    const result = await fetchLocalTextResult(path, label);
    if (result.kind === "ok") {
      return result.text ?? "";
    }
    if (result.kind === "error" && !firstError) {
      firstError = result.error ?? null;
    }
  }

  if (firstError) {
    throw firstError;
  }

  return "";
}

async function loadShoppingConfig(settings: SourceSettings): Promise<ShoppingConfig> {
  if (settings.mode === "github-public" && (!settings.githubOwner || !settings.githubRepo)) {
    return EMPTY_SHOPPING_CONFIG;
  }

  const aisleCandidates = [settings.aislePath, "config/aisle.conf", "aisle.conf", "shopping/aisle.conf"];
  const pantryCandidates = [settings.pantryPath, "config/pantry.conf", "pantry.conf", "shopping/pantry.conf"];

  const aisleRaw =
    settings.mode === "github-public"
      ? await fetchFirstGithubText(settings, aisleCandidates, "shopping config")
      : await fetchOptionalLocalText(aisleCandidates, "shopping config");

  const pantryRaw =
    settings.mode === "github-public"
      ? await fetchFirstGithubText(settings, pantryCandidates, "shopping config")
      : await fetchOptionalLocalText(pantryCandidates, "shopping config");

  return {
    aisleByIngredient: parseAisleConfig(aisleRaw),
    pantryByIngredient: parsePantryConfig(pantryRaw),
  };
}

function adaptBackendRecipe(raw: BackendRecipeDto): Recipe {
  return adaptRawRecipeFile({ path: raw.path, content: raw.content });
}

function sortRecipes(recipes: Recipe[]): Recipe[] {
  return recipes.sort((a, b) => a.path.localeCompare(b.path));
}

async function loadBackendData(): Promise<SourceSnapshot> {
  await fetchBackendHealth();
  const [config, recipesResponse] = await Promise.all([fetchBackendConfig(), fetchBackendRecipes()]);

  return {
    recipes: sortRecipes(recipesResponse.recipes.map(adaptBackendRecipe)),
    shoppingConfig: config.shoppingConfig,
    sourceSettings: normalizeSourceSettings(config.sourceSettings),
  };
}

function applySnapshot(
  options: UseRecipesSourceOptions,
  force: boolean,
  fingerprintState: { value: string },
  snapshot: SourceSnapshot,
): boolean {
  const nextFingerprint = buildSourceFingerprint(snapshot);
  if (!force && nextFingerprint === fingerprintState.value) {
    options.onStatus?.(createSuccessStatus());
    return false;
  }

  fingerprintState.value = nextFingerprint;
  options.onStatus?.(createSuccessStatus());
  options.onData(snapshot);
  return true;
}

function shouldUseViteFallback(settings: SourceSettings, recipes: Recipe[]): boolean {
  return (
    recipes.length === 0 &&
    import.meta.env.DEV &&
    settings.mode === "local-http" &&
    settings.recipesPath === DEFAULT_RECIPES_PATH
  );
}

async function fetchGithubTextResult(settings: SourceSettings, path: string, label: string): Promise<TextFetchResult> {
  const normalizedPath = normalizeRelativePath(path);
  if (!normalizedPath) {
    return { kind: "missing" };
  }

  return fetchTextResult(githubRawUrl(settings, normalizedPath), label);
}

async function fetchRequiredGithubText(settings: SourceSettings, path: string, label: string): Promise<string> {
  return fetchRequiredText(githubRawUrl(settings, path), label, path);
}

async function fetchFirstGithubText(settings: SourceSettings, paths: string[], label: string): Promise<string> {
  let firstError: SourceAccessError | null = null;

  for (const path of paths) {
    const result = await fetchGithubTextResult(settings, path, label);
    if (result.kind === "ok") {
      return result.text ?? "";
    }
    if (result.kind === "error" && !firstError) {
      firstError = result.error ?? null;
    }
  }

  if (firstError) {
    throw firstError;
  }

  return "";
}

async function loadLocalData(settings: SourceSettings): Promise<SourceSnapshot> {
  const recipes =
    settings.mode === "github-public"
      ? await fetchRecipesFromGithub(settings)
      : await fetchRecipesFromHttpDirectory(settings.recipesPath);
  const sourceSettings = normalizeSourceSettings(settings);
  const resolvedRecipes = shouldUseViteFallback(sourceSettings, recipes) ? await loadRecipesFromViteGlob() : recipes;

  return {
    recipes: sortRecipes(resolvedRecipes),
    shoppingConfig: await loadShoppingConfig(sourceSettings),
    sourceSettings,
  };
}

async function loadSourceSnapshot(settings: SourceSettings): Promise<SourceSnapshot> {
  if (settings.mode === "backend-api") {
    return loadBackendData();
  }

  return loadLocalData(settings);
}

export function useRecipesSource(options: UseRecipesSourceOptions) {
  let pollId: number | null = null;
  const fingerprintState = { value: "" };

  async function refresh(force = false): Promise<SourceRefreshResult> {
    const settings = getSourceSettings(options);

    try {
      const snapshot = await loadSourceSnapshot(settings);
      const updated = applySnapshot(options, force, fingerprintState, snapshot);

      return {
        snapshot,
        status: createSuccessStatus(),
        updated,
        error: null,
      };
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new SourceAccessError("Source refresh failed");
      const status = createFailureStatus(normalizedError);
      options.onStatus?.(status);

      return {
        snapshot: null,
        status,
        updated: false,
        error: normalizedError,
      };
    }
  }

  function startPolling() {
    stopPolling();
    pollId = window.setInterval(() => {
      void refresh(false);
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollId != null) {
      window.clearInterval(pollId);
      pollId = null;
    }
  }

  function handleVisibilityOrFocus() {
    if (document.hidden) return;
    void refresh(false);
  }

  function start() {
    void refresh(true);
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
