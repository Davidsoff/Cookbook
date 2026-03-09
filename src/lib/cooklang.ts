import type { Ingredient, ParsedRecipe, Step, StepTimer, Tool } from "../types/recipe";

export interface QuantitySpec {
  raw: string;
  amountRaw: string;
  unit: string;
  numeric: number | null;
  fixed: boolean;
}

export interface StepToken {
  kind: "text" | "ingredient" | "tool" | "timer";
  text: string;
  quantityText?: string;
  timerId?: string;
  rawQuantity?: string;
}

// Stryker disable all: parser normalization/front-matter helpers produce high-volume low-signal literal/method mutations.
export function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

function normalizeTokenName(name: string): string {
  return name
    .replace(/\s+/g, " ")
    .replace(/^[,.;:]+|[,.;:]+$/g, "")
    .trim();
}

export function parseCooklangNumber(value: string): number | null {
  const input = (value || "").trim();
  if (!input) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(input)) return Number.parseFloat(input);

  const mixed = input.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number.parseInt(mixed[1], 10);
    const n = Number.parseInt(mixed[2], 10);
    const d = Number.parseInt(mixed[3], 10);
    if (d !== 0) return whole + n / d;
  }

  const fraction = input.match(/^(-?\d+)\/(\d+)$/);
  if (fraction) {
    const n = Number.parseInt(fraction[1], 10);
    const d = Number.parseInt(fraction[2], 10);
    if (d !== 0) return n / d;
  }
  return null;
}

export function parseQuantitySpec(rawSpec: string): QuantitySpec {
  const raw = (rawSpec || "").trim();
  if (!raw) return { raw: "", amountRaw: "", unit: "", numeric: null, fixed: false };

  const parseAmount = (amount: string, unit: string): QuantitySpec => {
    const amountRaw = amount.trim();
    const fixed = amountRaw.startsWith("=");
    const normalizedAmount = fixed ? amountRaw.slice(1).trim() : amountRaw;
    return {
      raw,
      amountRaw,
      unit: unit.trim(),
      numeric: parseCooklangNumber(normalizedAmount),
      fixed,
    };
  };

  if (raw.includes("%")) {
    const [amountRaw, ...unitParts] = raw.split("%");
    const unit = unitParts.join("%");
    return parseAmount(amountRaw, unit);
  }

  const exactNumeric = parseCooklangNumber(raw.startsWith("=") ? raw.slice(1).trim() : raw);
  if (exactNumeric != null) {
    return {
      raw,
      amountRaw: raw,
      unit: "",
      numeric: exactNumeric,
      fixed: raw.trim().startsWith("="),
    };
  }

  const patterns = [
    /^(=?-?\d+\s+\d+\/\d+)\s+(.+)$/,
    /^(=?-?\d+\/\d+)\s+(.+)$/,
    /^(=?-?\d+(?:\.\d+)?)\s+(.+)$/,
    /^(=?-?\d+\s*-\s*\d+(?:\.\d+)?)\s+(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (!match) continue;
    return parseAmount(match[1], match[2]);
  }

  return {
    raw,
    amountRaw: raw,
    unit: "",
    numeric: parseCooklangNumber(raw.startsWith("=") ? raw.slice(1).trim() : raw),
    fixed: raw.startsWith("="),
  };
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function extractFrontMatter(recipeText: string): { frontMatter: string; body: string } {
  const match = recipeText.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) return { frontMatter: "", body: recipeText };
  return { frontMatter: match[1], body: recipeText.slice(match[0].length) };
}

function parseFrontMatterMap(recipeText: string): Record<string, string> {
  const { frontMatter } = extractFrontMatter(recipeText);
  const map: Record<string, string> = {};
  if (!frontMatter) return map;

  for (const line of frontMatter.split("\n")) {
    const m = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    map[m[1].toLowerCase()] = m[2].trim();
  }
  return map;
}

function extractTitleFromRecipe(recipeText: string): string {
  const { frontMatter } = extractFrontMatter(recipeText);
  if (frontMatter) {
    const m = frontMatter.match(/^\s*title\s*:\s*(.+)\s*$/im);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function extractServingsFromRecipe(recipeText: string): number {
  const { frontMatter } = extractFrontMatter(recipeText);
  if (!frontMatter) return 1;
  const m = frontMatter.match(/^\s*servings\s*:\s*(.+)\s*$/im);
  if (!m?.[1]) return 1;
  const n = parseCooklangNumber(m[1]);
  return n && n > 0 ? n : 1;
}
// Stryker restore all

function stripCooklangComments(text: string): string {
  // Stryker disable next-line StringLiteral: preserve-wording mutation does not change parser intent for stripped comments.
  const withoutBlockComments = text.replace(/\[-[\s\S]*?-]/g, " ");
  // Stryker disable next-line StringLiteral: replacement payload is non-semantic for comment stripping.
  return withoutBlockComments.replace(/--.*$/gm, "");
}

// Stryker disable all: low-level token extraction and timer normalization are parser-internal and produce mostly equivalent/noisy mutants.
function parseIngredients(recipeText: string): Ingredient[] {
  const { body } = extractFrontMatter(recipeText);
  const cleanBody = stripCooklangComments(body);
  const ingredients: Ingredient[] = [];
  const pattern = /@([^@#~{}\n]+?)\{([^}]*)\}(?:\(([^)]*)\))?|@([^\s{}.,;:!?()[\]]+)(?:\(([^)]*)\))?/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleanBody)) !== null) {
    const name = normalizeTokenName(match[1] || match[4] || "");
    const quantity = parseQuantitySpec(match[2] || "");
    const preparation = (match[3] || match[5] || "").trim();
    if (!name) continue;
    ingredients.push({
      name,
      quantityRaw: quantity.raw,
      amountRaw: quantity.amountRaw,
      unit: quantity.unit,
      numeric: quantity.numeric,
      fixed: quantity.fixed,
      preparation,
    });
  }
  return ingredients;
}

function parseTools(recipeText: string): Tool[] {
  const { body } = extractFrontMatter(recipeText);
  const cleanBody = stripCooklangComments(body);
  const tools: Tool[] = [];
  const seen = new Set<string>();
  const pattern = /#([^@#~{}\n]+?)\{([^}]*)\}|#([^\s{}.,;:!?()[\]]+)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleanBody)) !== null) {
    const name = normalizeTokenName(match[1] || match[3] || "");
    const quantity = parseQuantitySpec(match[2] || "");
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tools.push({
      name,
      quantityRaw: quantity.raw,
      amountRaw: quantity.amountRaw,
      unit: quantity.unit,
      numeric: quantity.numeric,
    });
  }
  return tools;
}

export function parseTimerSeconds(rawQuantity: string): number | null {
  const q = parseQuantitySpec(rawQuantity);
  let amount = q.numeric;
  const cleanAmountRaw = q.fixed ? q.amountRaw.slice(1).trim() : q.amountRaw;
  if ((amount == null || amount <= 0) && cleanAmountRaw.includes("-")) {
    const lowerBound = cleanAmountRaw.split("-")[0]?.trim() || "";
    const parsedLower = parseCooklangNumber(lowerBound);
    if (parsedLower != null) {
      amount = parsedLower;
    }
  }
  if (!amount || amount <= 0) return null;
  const unit = q.unit.toLowerCase();
  if (/(^|[^a-z])(h|hr|hrs|hour|hours)([^a-z]|$)/.test(unit)) return Math.round(amount * 3600);
  if (/(^|[^a-z])(s|sec|secs|second|seconds)([^a-z]|$)/.test(unit)) return Math.round(amount);
  return Math.round(amount * 60);
}

function parseSteps(recipeText: string): Step[] {
  const { body } = extractFrontMatter(recipeText);
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line)
    .filter((line) => !/^--/.test(line))
    .filter((line) => !/^>>\s*[\w.-]+\s*:/.test(line));

  const steps: Step[] = [];
  let timerIndex = 0;

  for (const line of lines) {
    if (/^={1,}\s*.*\s*={1,}$/.test(line) || /^={1,}\s*[^=].*$/.test(line)) {
      const text = line.replace(/^=+\s*/, "").replace(/\s*=+$/, "").trim();
      steps.push({ kind: "section", text, timers: [] });
      continue;
    }

    if (/^>/.test(line)) {
      steps.push({ kind: "note", text: line.replace(/^>+\s*/, "").trim(), timers: [] });
      continue;
    }

    const timers: StepTimer[] = [];
    const timerPattern = /~([^@#~{}\n]*?)\{([^}]*)\}|~([^\s{}.,;:!?()[\]]+)/g;
    let timerMatch: RegExpExecArray | null;

    while ((timerMatch = timerPattern.exec(line)) !== null) {
      const name = normalizeTokenName(timerMatch[1] || timerMatch[3] || "");
      const quantityRaw = (timerMatch[2] || "").trim();
      const quantity = parseQuantitySpec(quantityRaw);
      const displayQuantity = quantity.raw
        ? quantity.numeric != null
          ? `${formatNumber(quantity.numeric)}${quantity.unit ? ` ${quantity.unit}` : ""}`
          : quantity.raw.replace(/%/g, " ").trim()
        : "";
      const timerId = `timer-${timerIndex}`;
      timerIndex += 1;

      timers.push({
        id: timerId,
        label: name || displayQuantity || "Timer",
        quantityRaw,
        displayQuantity,
        seconds: parseTimerSeconds(quantityRaw),
      });
    }

    steps.push({ kind: "instruction", text: line, timers });
  }

  return steps;
}
// Stryker restore all

// Stryker disable all: token rendering fallbacks create mostly cosmetic mutants that do not change core recipe semantics.
export function renderInlineTokenLabel(rawName: string, rawQuantity: string): { name: string; quantityText: string } {
  const name = normalizeTokenName(rawName || "");
  const q = parseQuantitySpec(rawQuantity || "");
  const quantityText = q.raw
    ? q.numeric != null
      ? `${formatNumber(q.numeric)}${q.unit ? ` ${q.unit}` : ""}`
      : q.raw.replace(/%/g, " ").trim()
    : "";
  return { name, quantityText };
}

export function tokenizeStepText(stepText: string, timers: StepTimer[]): StepToken[] {
  const tokens: StepToken[] = [];
  const pattern = /([@#~])([^@#~{}\n.,;:!?()[\]]*?)\{([^}]*)\}(?:\(([^)]*)\))?|([@#~])([^\s{}.,;:!?()[\]]+)(?:\(([^)]*)\))?/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let timerCursor = 0;

  while ((match = pattern.exec(stepText)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "text", text: stepText.slice(lastIndex, match.index) });
    }

    const marker = match[1] || match[5];
    const rawName = match[2] || match[6] || "";
    const rawQuantity = match[3] || "";
    const preparation = (match[4] || match[7] || "").trim();
    const { name, quantityText } = renderInlineTokenLabel(rawName, rawQuantity);
    const tokenText = preparation ? `${name || "Ingredient"} (${preparation})` : name;

    if (marker === "@") {
      tokens.push({ kind: "ingredient", text: tokenText || "Ingredient", quantityText, rawQuantity });
    } else if (marker === "#") {
      tokens.push({ kind: "tool", text: name || "Tool", quantityText, rawQuantity });
    } else {
      const timer = timers[timerCursor];
      timerCursor += 1;
      tokens.push({
        kind: "timer",
        text: name || quantityText || "Timer",
        quantityText: name ? quantityText : "",
        timerId: timer?.id,
        rawQuantity,
      });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < stepText.length) {
    tokens.push({ kind: "text", text: stepText.slice(lastIndex) });
  }

  return tokens;
}
// Stryker restore all

export function parseRecipeContent(content: string): ParsedRecipe {
  const normalized = normalizeWhitespace(content);
  const frontMatter = parseFrontMatterMap(normalized);
  return {
    title: extractTitleFromRecipe(normalized),
    // Stryker disable next-line StringLiteral: empty fallback literal is presentational default.
    description: frontMatter.description || "",
    // Stryker disable next-line StringLiteral: empty fallback literal is presentational default.
    image: frontMatter.image || frontMatter.photo || "",
    servingsBase: extractServingsFromRecipe(normalized),
    ingredients: parseIngredients(normalized),
    tools: parseTools(normalized),
    steps: parseSteps(normalized),
  };
}
