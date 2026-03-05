const state = {
  recipes: [],
  activeRecipeIndex: -1,
  tab: "ingredients",
  servingsBase: 1,
  servingsTarget: 1,
  unitSystem: "metric",
  runningTimers: {},
  source: {
    type: "none",
    dirHandle: null,
    pollId: null,
    fingerprint: "",
  },
};

const DEFAULT_RECIPES_PATH = "recipes/";
const POLL_INTERVAL_MS = 3000;

const UNIT_DEFS = {
  g: { dimension: "weight", toBase: 1 },
  kg: { dimension: "weight", toBase: 1000 },
  oz: { dimension: "weight", toBase: 28.349523125 },
  lb: { dimension: "weight", toBase: 453.59237 },
  ml: { dimension: "volume", toBase: 1 },
  l: { dimension: "volume", toBase: 1000 },
  tsp_us: { dimension: "volume", toBase: 4.92892159375 },
  tbsp_us: { dimension: "volume", toBase: 14.78676478125 },
  floz_us: { dimension: "volume", toBase: 29.5735295625 },
  cup_us: { dimension: "volume", toBase: 236.5882365 },
  pint_us: { dimension: "volume", toBase: 473.176473 },
  quart_us: { dimension: "volume", toBase: 946.352946 },
  gallon_us: { dimension: "volume", toBase: 3785.411784 },
};

const UNIT_ALIASES = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kgs: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  tsp: "tsp_us",
  teaspoon: "tsp_us",
  teaspoons: "tsp_us",
  tbsp: "tbsp_us",
  tablespoon: "tbsp_us",
  tablespoons: "tbsp_us",
  "fl oz": "floz_us",
  floz: "floz_us",
  fluidounce: "floz_us",
  fluidounces: "floz_us",
  cup: "cup_us",
  cups: "cup_us",
  c: "cup_us",
  pt: "pint_us",
  pint: "pint_us",
  pints: "pint_us",
  qt: "quart_us",
  quart: "quart_us",
  quarts: "quart_us",
  gal: "gallon_us",
  gallon: "gallon_us",
  gallons: "gallon_us",
};

const TARGET_UNITS = {
  metric: {
    weight: [
      { key: "kg", label: "kg" },
      { key: "g", label: "g" },
    ],
    volume: [
      { key: "l", label: "l" },
      { key: "ml", label: "ml" },
    ],
  },
  us: {
    weight: [
      { key: "lb", label: "lb" },
      { key: "oz", label: "oz" },
    ],
    volume: [
      { key: "cup_us", label: "cup" },
      { key: "floz_us", label: "fl oz" },
      { key: "tbsp_us", label: "tbsp" },
      { key: "tsp_us", label: "tsp" },
    ],
  },
};

const els = {
  pickFolderBtn: document.getElementById("pick-folder-btn"),
  folderInput: document.getElementById("folder-input"),
  recipesEmpty: document.getElementById("recipes-empty"),
  recipeItems: document.getElementById("recipe-items"),
  recipeEmpty: document.getElementById("recipe-empty"),
  recipeView: document.getElementById("recipe-view"),
  recipeTitle: document.getElementById("recipe-title"),
  recipeDescription: document.getElementById("recipe-description"),
  recipeHeroImageWrap: document.getElementById("recipe-hero-image-wrap"),
  recipeHeroImage: document.getElementById("recipe-hero-image"),
  recipePath: document.getElementById("recipe-path"),
  tabIngredients: document.getElementById("tab-ingredients"),
  tabSteps: document.getElementById("tab-steps"),
  tabTools: document.getElementById("tab-tools"),
  panelIngredients: document.getElementById("tab-panel-ingredients"),
  panelSteps: document.getElementById("tab-panel-steps"),
  panelTools: document.getElementById("tab-panel-tools"),
  scaleSummary: document.getElementById("scale-summary"),
  scaleDown: document.getElementById("scale-down"),
  scaleUp: document.getElementById("scale-up"),
  scaleReset: document.getElementById("scale-reset"),
  unitSegments: Array.from(document.querySelectorAll("[data-unit-system]")),
  ingredientList: document.getElementById("ingredient-list"),
  stepList: document.getElementById("step-list"),
  toolList: document.getElementById("tool-list"),
  toolEmpty: document.getElementById("tool-empty"),
  activeTimerList: document.getElementById("active-timer-list"),
  activeTimerEmpty: document.getElementById("active-timer-empty"),
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeWhitespace(text) {
  return text.replace(/\r\n/g, "\n").trim();
}

function normalizeTokenName(name) {
  return name
    .replace(/\s+/g, " ")
    .replace(/^[,.;:]+|[,.;:]+$/g, "")
    .trim();
}

function parseCooklangNumber(value) {
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

function parseQuantitySpec(rawSpec) {
  const raw = (rawSpec || "").trim();
  if (!raw) return { raw: "", amountRaw: "", unit: "", numeric: null };
  const [amountRaw, ...unitParts] = raw.split("%");
  const unit = unitParts.join("%").trim();
  return {
    raw,
    amountRaw: amountRaw.trim(),
    unit,
    numeric: parseCooklangNumber(amountRaw),
  };
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function roundToStep(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
  return Math.round(value / step) * step;
}

function roundConvertedAmount(amount, unitLabel) {
  const unit = (unitLabel || "").trim().toLowerCase();
  if (unit === "g" || unit === "ml") {
    const abs = Math.abs(amount);
    if (abs >= 5000) return roundToStep(amount, 1000);
    if (abs >= 1000) return roundToStep(amount, 100);
    if (abs >= 100) return roundToStep(amount, 10);
    if (abs >= 20) return roundToStep(amount, 5);
    return roundToStep(amount, 1);
  }
  return amount;
}

function normalizeUnitKey(unit) {
  const raw = (unit || "").trim().toLowerCase();
  if (!raw) return "";
  const normalized = raw
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .replace(/^us\s+/, "")
    .replace(/\s+us$/, "")
    .trim();
  if (UNIT_ALIASES[normalized]) return UNIT_ALIASES[normalized];
  const compact = normalized.replace(/\s+/g, "");
  return UNIT_ALIASES[compact] || "";
}

function pickTargetUnit(baseAmount, system, dimension) {
  const candidates = TARGET_UNITS[system]?.[dimension];
  if (!candidates?.length) return null;
  for (const candidate of candidates) {
    const def = UNIT_DEFS[candidate.key];
    if (!def) continue;
    const value = baseAmount / def.toBase;
    if (Math.abs(value) >= 1) return candidate;
  }
  return candidates[candidates.length - 1];
}

function convertAmountToSystem(amount, unit, system) {
  const sourceKey = normalizeUnitKey(unit);
  const sourceDef = UNIT_DEFS[sourceKey];
  if (!sourceDef) return null;
  if (system === "us" && sourceDef.dimension === "volume" && /_us$/.test(sourceKey)) {
    const baseAmount = amount * sourceDef.toBase;
    return {
      amount: baseAmount / sourceDef.toBase,
      unit: (TARGET_UNITS.us.volume.find((u) => u.key === sourceKey)?.label) || unit || "",
    };
  }
  const target = pickTargetUnit(amount * sourceDef.toBase, system, sourceDef.dimension);
  if (!target) return null;
  const targetDef = UNIT_DEFS[target.key];
  if (!targetDef) return null;
  const baseAmount = amount * sourceDef.toBase;
  return {
    amount: baseAmount / targetDef.toBase,
    unit: target.label,
  };
}

function hashText(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16);
}

function extractFrontMatter(recipeText) {
  const match = recipeText.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
  if (!match) return { frontMatter: "", body: recipeText };
  return { frontMatter: match[1], body: recipeText.slice(match[0].length) };
}

function parseFrontMatterMap(recipeText) {
  const { frontMatter } = extractFrontMatter(recipeText);
  const map = {};
  if (!frontMatter) return map;

  for (const line of frontMatter.split("\n")) {
    const m = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    map[m[1].toLowerCase()] = m[2].trim();
  }
  return map;
}

function extractTitleFromRecipe(recipeText) {
  const { frontMatter } = extractFrontMatter(recipeText);
  if (frontMatter) {
    const m = frontMatter.match(/^\s*title\s*:\s*(.+)\s*$/im);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function extractServingsFromRecipe(recipeText) {
  const { frontMatter } = extractFrontMatter(recipeText);
  if (!frontMatter) return 1;
  const m = frontMatter.match(/^\s*servings\s*:\s*(.+)\s*$/im);
  if (!m?.[1]) return 1;
  const n = parseCooklangNumber(m[1]);
  return n && n > 0 ? n : 1;
}

function stripCooklangComments(text) {
  const withoutBlockComments = text.replace(/\[-[\s\S]*?-]/g, " ");
  return withoutBlockComments.replace(/--.*$/gm, "");
}

function parseIngredients(recipeText) {
  const { body } = extractFrontMatter(recipeText);
  const cleanBody = stripCooklangComments(body);
  const ingredients = [];
  const pattern = /@([^{}\n]+?)\{([^}]*)\}|@([^\s{}.,;:!?()[\]]+)/g;
  let match;

  while ((match = pattern.exec(cleanBody)) !== null) {
    const name = normalizeTokenName(match[1] || match[3] || "");
    const quantity = parseQuantitySpec(match[2] || "");
    if (!name) continue;
    ingredients.push({
      name,
      quantityRaw: quantity.raw,
      amountRaw: quantity.amountRaw,
      unit: quantity.unit,
      numeric: quantity.numeric,
    });
  }
  return ingredients;
}

function parseTools(recipeText) {
  const { body } = extractFrontMatter(recipeText);
  const cleanBody = stripCooklangComments(body);
  const tools = [];
  const seen = new Set();
  const pattern = /#([^{}\n]+?)\{([^}]*)\}|#([^\s{}.,;:!?()[\]]+)/g;
  let match;

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

function parseTimerSeconds(rawQuantity) {
  const q = parseQuantitySpec(rawQuantity);
  if (!q.numeric || q.numeric <= 0) return null;
  const unit = q.unit.toLowerCase();
  if (/(^|[^a-z])(h|hr|hrs|hour|hours)([^a-z]|$)/.test(unit)) return Math.round(q.numeric * 3600);
  if (/(^|[^a-z])(s|sec|secs|second|seconds)([^a-z]|$)/.test(unit)) return Math.round(q.numeric);
  return Math.round(q.numeric * 60);
}

function parseSteps(recipeText) {
  const { body } = extractFrontMatter(recipeText);
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line)
    .filter((line) => !/^--/.test(line))
    .filter((line) => !/^>>\s*[\w.-]+\s*:/.test(line));

  const steps = [];
  let timerIndex = 0;

  for (const line of lines) {
    const timers = [];
    const timerPattern = /~([^{}\n]*?)\{([^}]*)\}|~([^\s{}.,;:!?()[\]]+)/g;
    let timerMatch;

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

    steps.push({ text: line, timers });
  }

  return steps;
}

function parseRecipeContent(content) {
  const normalized = normalizeWhitespace(content);
  const frontMatter = parseFrontMatterMap(normalized);
  return {
    title: extractTitleFromRecipe(normalized),
    description: frontMatter.description || "",
    image: frontMatter.image || frontMatter.photo || "",
    servingsBase: extractServingsFromRecipe(normalized),
    ingredients: parseIngredients(normalized),
    tools: parseTools(normalized),
    steps: parseSteps(normalized),
  };
}

function getScaleFactor() {
  if (!state.servingsBase || state.servingsBase <= 0) return 1;
  return state.servingsTarget / state.servingsBase;
}

function formatScaledIngredient(ingredient) {
  if (ingredient.numeric == null) return ingredient.quantityRaw || "";
  const scaled = ingredient.numeric * getScaleFactor();
  const converted = convertAmountToSystem(scaled, ingredient.unit, state.unitSystem);
  if (converted) {
    const roundedAmount = roundConvertedAmount(converted.amount, converted.unit);
    return `${formatNumber(roundedAmount)}${converted.unit ? ` ${converted.unit}` : ""}`;
  }
  return `${formatNumber(scaled)}${ingredient.unit ? ` ${ingredient.unit}` : ""}`;
}

function formatClock(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getRemainingTimerSeconds(timerId) {
  const t = state.runningTimers[timerId];
  if (!t) return 0;
  return Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000));
}

function renderInlineToken(marker, rawName, rawQuantity, timerId = "") {
  const name = normalizeTokenName(rawName || "");
  const q = parseQuantitySpec(rawQuantity || "");
  const qtyText = q.raw
    ? q.numeric != null
      ? `${formatNumber(q.numeric)}${q.unit ? ` ${q.unit}` : ""}`
      : q.raw.replace(/%/g, " ").trim()
    : "";

  if (marker === "@") {
    return `<span class="inline-token ingredient"><span>${escapeHtml(name || "Ingredient")}</span>${qtyText ? `<span class="inline-token-qty">${escapeHtml(qtyText)}</span>` : ""}</span>`;
  }
  if (marker === "#") {
    return `<span class="inline-token tool"><span>${escapeHtml(name || "Tool")}</span>${qtyText ? `<span class="inline-token-qty">${escapeHtml(qtyText)}</span>` : ""}</span>`;
  }
  const timerLabel = name ? `${name}${qtyText ? ` ${qtyText}` : ""}`.trim() : qtyText || "Timer";
  if (timerId) {
    const running = getRemainingTimerSeconds(timerId) > 0 ? " running" : "";
    return `<button class="inline-token timer click-target${running}" data-timer-id="${escapeHtml(timerId)}">${escapeHtml(timerLabel)}</button>`;
  }
  return `<span class="inline-token timer">${escapeHtml(timerLabel)}</span>`;
}

function renderStepText(stepText, timers = []) {
  const pattern = /([@#~])([^{}\n.,;:!?()[\]]*?)\{([^}]*)\}|([@#~])([^\s{}.,;:!?()[\]]+)/g;
  let output = "";
  let lastIndex = 0;
  let match;
  let timerCursor = 0;

  while ((match = pattern.exec(stepText)) !== null) {
    if (match.index > lastIndex) output += escapeHtml(stepText.slice(lastIndex, match.index));
    const marker = match[1] || match[4];
    const name = match[2] || match[5] || "";
    const quantity = match[3] || "";
    if (marker === "~") {
      const timerId = timers[timerCursor]?.id || "";
      timerCursor += 1;
      output += renderInlineToken(marker, name, quantity, timerId);
    } else {
      output += renderInlineToken(marker, name, quantity);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < stepText.length) output += escapeHtml(stepText.slice(lastIndex));
  return output;
}

function getActiveRecipe() {
  return state.recipes[state.activeRecipeIndex] || null;
}

function stopTimer(timerId) {
  const t = state.runningTimers[timerId];
  if (!t) return;
  clearTimeout(t.timeoutId);
  clearInterval(t.intervalId);
  delete state.runningTimers[timerId];
}

function toggleTimer(timerId) {
  const recipe = getActiveRecipe();
  if (!recipe || !timerId) return;

  if (state.runningTimers[timerId]) {
    stopTimer(timerId);
    render();
    return;
  }

  let def = null;
  for (const step of recipe.parsed.steps) {
    const found = step.timers.find((t) => t.id === timerId);
    if (found) {
      def = found;
      break;
    }
  }
  if (!def || !def.seconds) return;

  const endsAt = Date.now() + def.seconds * 1000;
  const intervalId = setInterval(() => {
    if (!state.runningTimers[timerId]) {
      clearInterval(intervalId);
      return;
    }
    if (Date.now() >= endsAt) return;
    renderActiveTimers();
    rerenderTimerTokensOnly();
  }, 1000);

  const timeoutId = setTimeout(() => {
    stopTimer(timerId);
    render();
    alert(`Timer done: ${def.label}`);
  }, def.seconds * 1000);

  state.runningTimers[timerId] = {
    id: timerId,
    label: def.displayQuantity ? `${def.label} (${def.displayQuantity})` : def.label,
    endsAt,
    intervalId,
    timeoutId,
  };
  render();
}

function rerenderTimerTokensOnly() {
  const buttons = els.stepList.querySelectorAll("button[data-timer-id]");
  for (const btn of buttons) {
    const timerId = btn.getAttribute("data-timer-id");
    if (!timerId) continue;
    if (state.runningTimers[timerId]) btn.classList.add("running");
    else btn.classList.remove("running");
  }
}

function renderRecipeList() {
  els.recipeItems.innerHTML = "";
  els.recipesEmpty.classList.toggle("hidden", state.recipes.length > 0);

  state.recipes.forEach((recipe, index) => {
    const li = document.createElement("li");
    li.textContent = recipe.parsed.title || recipe.name;
    if (index === state.activeRecipeIndex) li.classList.add("active");
    li.addEventListener("click", () => {
      state.activeRecipeIndex = index;
      state.tab = "ingredients";
      state.servingsBase = recipe.parsed.servingsBase || 1;
      state.servingsTarget = state.servingsBase;
      Object.keys(state.runningTimers).forEach(stopTimer);
      render();
    });
    els.recipeItems.appendChild(li);
  });
}

function renderIngredients(recipe) {
  els.scaleSummary.textContent = `Base servings: ${formatNumber(state.servingsBase)} | Target servings: ${formatNumber(state.servingsTarget)} | Scale: ${formatNumber(getScaleFactor())}x | Units: ${state.unitSystem}`;
  els.unitSegments.forEach((button) => {
    const isActive = button.getAttribute("data-unit-system") === state.unitSystem;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  els.ingredientList.innerHTML = "";
  recipe.parsed.ingredients.forEach((ingredient) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(ingredient.name)}</span><span class="muted">${escapeHtml(formatScaledIngredient(ingredient) || "-")}</span>`;
    els.ingredientList.appendChild(li);
  });
}

function renderSteps(recipe) {
  els.stepList.innerHTML = "";
  recipe.parsed.steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${i + 1}.</strong> ${renderStepText(step.text, step.timers)}`;
    els.stepList.appendChild(li);
  });

  els.stepList.querySelectorAll("button[data-timer-id]").forEach((btn) => {
    btn.addEventListener("click", () => toggleTimer(btn.getAttribute("data-timer-id")));
  });
}

function formatToolDisplay(tool) {
  if (tool.numeric == null) return tool.quantityRaw || "";
  return `${formatNumber(tool.numeric)}${tool.unit ? ` ${tool.unit}` : ""}`;
}

function renderTools(recipe) {
  const tools = recipe.parsed.tools || [];
  els.toolList.innerHTML = "";
  els.toolEmpty.classList.toggle("hidden", tools.length > 0);

  tools.forEach((tool) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(tool.name)}</span><span class="muted">${escapeHtml(formatToolDisplay(tool) || "-")}</span>`;
    els.toolList.appendChild(li);
  });
}

function renderActiveTimers() {
  const active = Object.values(state.runningTimers);
  els.activeTimerList.innerHTML = "";
  els.activeTimerEmpty.classList.toggle("hidden", active.length > 0);

  active.forEach((t) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="timer-main">
        <span>${escapeHtml(t.label)}</span>
        <span>${escapeHtml(formatClock(getRemainingTimerSeconds(t.id)))}</span>
      </div>
      <button data-timer-id="${escapeHtml(t.id)}">Cancel</button>
    `;
    li.querySelector("button")?.addEventListener("click", () => toggleTimer(t.id));
    els.activeTimerList.appendChild(li);
  });
}

function render() {
  renderRecipeList();
  const recipe = getActiveRecipe();
  const hasRecipe = Boolean(recipe);
  els.recipeEmpty.classList.toggle("hidden", hasRecipe);
  els.recipeView.classList.toggle("hidden", !hasRecipe);
  if (!recipe) {
    if (state.source.type === "default-http") {
      els.recipeEmpty.textContent = "No recipes found in ./recipes yet. Add .cook files and they will appear automatically.";
    } else {
      els.recipeEmpty.textContent = "Pick a folder to load recipes.";
    }
    return;
  }

  els.recipeTitle.textContent = recipe.parsed.title || recipe.name;
  els.recipeDescription.textContent = recipe.parsed.description || "No description provided.";
  const imageUrl = recipe.parsed.image || "";
  if (imageUrl) {
    els.recipeHeroImage.src = imageUrl;
    els.recipeHeroImageWrap.classList.remove("hidden");
  } else {
    els.recipeHeroImage.removeAttribute("src");
    els.recipeHeroImageWrap.classList.add("hidden");
  }
  els.recipePath.textContent = recipe.path;

  els.tabIngredients.classList.toggle("active", state.tab === "ingredients");
  els.tabSteps.classList.toggle("active", state.tab === "steps");
  els.tabTools.classList.toggle("active", state.tab === "tools");
  els.panelIngredients.classList.toggle("hidden", state.tab !== "ingredients");
  els.panelSteps.classList.toggle("hidden", state.tab !== "steps");
  els.panelTools.classList.toggle("hidden", state.tab !== "tools");

  renderIngredients(recipe);
  renderSteps(recipe);
  renderTools(recipe);
  renderActiveTimers();
}

async function readRecipeFilesFromDirectoryHandle(dirHandle, prefix = "") {
  const recipes = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind === "directory") {
      const nested = await readRecipeFilesFromDirectoryHandle(entry, `${prefix}${entry.name}/`);
      recipes.push(...nested);
      continue;
    }

    if (entry.kind === "file" && entry.name.toLowerCase().endsWith(".cook")) {
      const file = await entry.getFile();
      const content = await file.text();
      recipes.push({
        name: entry.name.replace(/\.cook$/i, ""),
        path: `${prefix}${entry.name}`,
        content,
        parsed: parseRecipeContent(content),
      });
    }
  }
  return recipes;
}

function extractLinksFromDirectoryListing(html) {
  const links = [];
  const hrefPattern = /href="([^"]+)"/gi;
  let match;
  while ((match = hrefPattern.exec(html)) !== null) {
    const href = match[1];
    if (!href || href === "../") continue;
    links.push(href);
  }
  return links;
}

async function fetchRecipesFromHttpDirectory(basePath = DEFAULT_RECIPES_PATH) {
  const recipes = [];
  const queue = [basePath.replace(/\/?$/, "/")];
  const seen = new Set();

  while (queue.length > 0) {
    const dirPath = queue.shift();
    if (!dirPath || seen.has(dirPath)) continue;
    seen.add(dirPath);

    let res;
    try {
      res = await fetch(dirPath, { cache: "no-store" });
    } catch (_error) {
      continue;
    }
    if (!res.ok) continue;

    const html = await res.text();
    const links = extractLinksFromDirectoryListing(html);
    for (const rawHref of links) {
      let href;
      try {
        href = decodeURIComponent(rawHref);
      } catch (_error) {
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
      let fileRes;
      try {
        fileRes = await fetch(fileUrl.toString(), { cache: "no-store" });
      } catch (_error) {
        continue;
      }
      if (!fileRes.ok) continue;
      const content = await fileRes.text();
      recipes.push({
        name: path.split("/").pop().replace(/\.cook$/i, ""),
        path,
        content,
        parsed: parseRecipeContent(content),
      });
    }
  }

  return recipes;
}

async function pickFolderAndLoad() {
  if (typeof window.showDirectoryPicker !== "function") {
    els.folderInput.click();
    return;
  }

  try {
    const dirHandle = await window.showDirectoryPicker();
    state.source.type = "dir-handle";
    state.source.dirHandle = dirHandle;
    await refreshFromSource({ force: true });
    startSourcePolling();
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error(error);
    }
  }
}

async function loadFromInputFiles(fileList) {
  const files = Array.from(fileList || []).filter((f) => f.name.toLowerCase().endsWith(".cook"));
  const recipes = [];
  for (const file of files) {
    const content = await file.text();
    recipes.push({
      name: file.name.replace(/\.cook$/i, ""),
      path: file.webkitRelativePath || file.name,
      content,
      parsed: parseRecipeContent(content),
    });
  }
  state.source.type = "upload";
  state.source.dirHandle = null;
  stopSourcePolling();
  applyRecipes(recipes, { force: true });
}

function buildRecipesFingerprint(recipes) {
  return recipes
    .map((recipe) => `${recipe.path}:${hashText(recipe.content)}`)
    .sort()
    .join("|");
}

function applyRecipes(recipes, opts = {}) {
  const { force = false } = opts;
  recipes.sort((a, b) => a.path.localeCompare(b.path));
  const nextFingerprint = buildRecipesFingerprint(recipes);
  if (!force && nextFingerprint === state.source.fingerprint) {
    return false;
  }

  const previousActivePath = getActiveRecipe()?.path || "";

  state.recipes = recipes;
  const nextIndex = recipes.findIndex((recipe) => recipe.path === previousActivePath);
  state.activeRecipeIndex = nextIndex >= 0 ? nextIndex : recipes.length ? 0 : -1;
  state.tab = "ingredients";

  const recipe = getActiveRecipe();
  state.servingsBase = recipe?.parsed.servingsBase || 1;
  state.servingsTarget = state.servingsBase;
  Object.keys(state.runningTimers).forEach(stopTimer);
  state.source.fingerprint = nextFingerprint;
  render();
  return true;
}

async function refreshFromSource(opts = {}) {
  const { force = false } = opts;

  if (state.source.type === "dir-handle" && state.source.dirHandle) {
    const recipes = await readRecipeFilesFromDirectoryHandle(state.source.dirHandle);
    applyRecipes(recipes, { force });
    return;
  }

  if (state.source.type === "default-http") {
    const recipes = await fetchRecipesFromHttpDirectory(DEFAULT_RECIPES_PATH);
    applyRecipes(recipes, { force });
    return;
  }
}

function stopSourcePolling() {
  if (state.source.pollId) {
    clearInterval(state.source.pollId);
    state.source.pollId = null;
  }
}

function startSourcePolling() {
  stopSourcePolling();
  if (state.source.type !== "dir-handle" && state.source.type !== "default-http") {
    return;
  }
  state.source.pollId = setInterval(() => {
    refreshFromSource({ force: false }).catch(console.error);
  }, POLL_INTERVAL_MS);
}

async function initDefaultSource() {
  state.source.type = "default-http";
  state.source.dirHandle = null;
  state.source.fingerprint = "";
  await refreshFromSource({ force: true });
  startSourcePolling();
}

function initPageVisibilityRefresh() {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && (state.source.type === "dir-handle" || state.source.type === "default-http")) {
      refreshFromSource({ force: false }).catch(console.error);
    }
  });
  window.addEventListener("focus", () => {
    if (state.source.type === "dir-handle" || state.source.type === "default-http") {
      refreshFromSource({ force: false }).catch(console.error);
    }
  });
}

function initBeforeUnload() {
  window.addEventListener("beforeunload", () => {
    stopSourcePolling();
  });
}

function initSources() {
  initDefaultSource().catch(console.error);
}

function initEvents() {
  els.pickFolderBtn.addEventListener("click", pickFolderAndLoad);
  els.folderInput.addEventListener("change", () => loadFromInputFiles(els.folderInput.files));
  els.tabIngredients.addEventListener("click", () => {
    state.tab = "ingredients";
    render();
  });
  els.tabSteps.addEventListener("click", () => {
    state.tab = "steps";
    render();
  });
  els.tabTools.addEventListener("click", () => {
    state.tab = "tools";
    render();
  });
  els.scaleDown.addEventListener("click", () => {
    state.servingsTarget = Math.max(1, state.servingsTarget - 1);
    render();
  });
  els.scaleUp.addEventListener("click", () => {
    state.servingsTarget = Math.min(64, state.servingsTarget + 1);
    render();
  });
  els.scaleReset.addEventListener("click", () => {
    state.servingsTarget = state.servingsBase || 1;
    render();
  });
  els.unitSegments.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.getAttribute("data-unit-system") || "metric";
      if (next === state.unitSystem) return;
      state.unitSystem = next;
      render();
    });
  });
}

initEvents();
initPageVisibilityRefresh();
initBeforeUnload();
initSources();
render();
