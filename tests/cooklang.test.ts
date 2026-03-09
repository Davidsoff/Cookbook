import { describe, expect, it } from "vitest";
import {
  parseQuantitySpec,
  parseRecipeContent,
  parseCooklangNumber,
  parseTimerSeconds,
  tokenizeStepText,
  formatNumber,
} from "../src/lib/cooklang";

describe("cooklang parser", () => {
  it("parses front matter and body tokens", () => {
    const raw = `---\ntitle: Pasta\ndescription: Quick\nservings: 4\n---\nBoil @water{1%l}(cold) in #pot and simmer ~timer{10%min}`;
    const parsed = parseRecipeContent(raw);

    expect(parsed.title).toBe("Pasta");
    expect(parsed.description).toBe("Quick");
    expect(parsed.servingsBase).toBe(4);
    expect(parsed.ingredients[0].name).toBe("water");
    expect(parsed.ingredients[0].preparation).toBe("cold");
    expect(parsed.tools[0].name).toBe("pot");
    expect(parsed.steps[0].kind).toBe("instruction");
    if (parsed.steps[0].kind === "instruction") {
      expect(parsed.steps[0].timers[0].seconds).toBe(600);
    }
  });

  it("supports integer, fraction, and mixed fraction numbers", () => {
    expect(parseCooklangNumber("2")).toBe(2);
    expect(parseCooklangNumber("1/2")).toBe(0.5);
    expect(parseCooklangNumber("1 1/2")).toBe(1.5);
    expect(parseCooklangNumber("1/0")).toBeNull();
    expect(parseCooklangNumber("")).toBeNull();
  });

  it("parses space-separated quantity, fixed quantities, and unit", () => {
    expect(parseQuantitySpec("0.25 cup")).toEqual({
      raw: "0.25 cup",
      amountRaw: "0.25",
      unit: "cup",
      numeric: 0.25,
      fixed: false,
    });

    expect(parseQuantitySpec("=2%tbsp")).toEqual({
      raw: "=2%tbsp",
      amountRaw: "=2",
      unit: "tbsp",
      numeric: 2,
      fixed: true,
    });
  });

  it("handles empty and numeric-only quantities", () => {
    expect(parseQuantitySpec("")).toEqual({
      raw: "",
      amountRaw: "",
      unit: "",
      numeric: null,
      fixed: false,
    });

    expect(parseQuantitySpec("2")).toEqual({
      raw: "2",
      amountRaw: "2",
      unit: "",
      numeric: 2,
      fixed: false,
    });

    expect(parseQuantitySpec("=2")).toEqual({
      raw: "=2",
      amountRaw: "=2",
      unit: "",
      numeric: 2,
      fixed: true,
    });
  });

  it("tokenizes step inline markers and keeps preparation", () => {
    const tokens = tokenizeStepText("Add @salt{2%g}(fine) with #pan then ~rest{5%min}", [
      {
        id: "timer-1",
        label: "rest",
        quantityRaw: "5%min",
        displayQuantity: "5 min",
        seconds: 300,
      },
    ]);

    expect(tokens.some((token) => token.kind === "ingredient")).toBe(true);
    expect(tokens.some((token) => token.kind === "tool")).toBe(true);
    expect(tokens.find((token) => token.kind === "timer")?.timerId).toBe("timer-1");
    expect(tokens.find((token) => token.kind === "ingredient")?.rawQuantity).toBe("2%g");
    expect(tokens.find((token) => token.kind === "ingredient")?.text).toContain("fine");
  });

  it("parses timer units", () => {
    expect(parseTimerSeconds("1%hour")).toBe(3600);
    expect(parseTimerSeconds("30%sec")).toBe(30);
    expect(parseTimerSeconds("5%min")).toBe(300);
    expect(parseTimerSeconds("3-5%minutes")).toBe(180);
    expect(parseTimerSeconds("0%min")).toBeNull();
  });

  it("parses sections and notes", () => {
    const parsed = parseRecipeContent(`= Sauce =\n> Stir gently\nMix @water{1%cup}`);
    expect(parsed.steps[0].kind).toBe("section");
    expect(parsed.steps[1].kind).toBe("note");
    expect(parsed.steps[2].kind).toBe("instruction");
  });

  it("parses ingredient/tool tokens and strips comments", () => {
    const parsed = parseRecipeContent(
      `---\ntitle: T\n---\n-- comment\nAdd @salt{2%g}(fine) and #pan{}.\n[-block-]\nStir @pepper{1%g}`,
    );
    expect(parsed.ingredients.map((ingredient) => ingredient.name)).toEqual(["salt", "pepper"]);
    expect(parsed.ingredients[0].preparation).toBe("fine");
    expect(parsed.ingredients[0].numeric).toBe(2);
    expect(parsed.ingredients[0].unit).toBe("g");
    expect(parsed.ingredients[1].numeric).toBe(1);
    expect(parsed.tools.map((tool) => tool.name)).toEqual(["pan"]);
    expect(parsed.tools[0].quantityRaw).toBe("");
  });

  it("prefers image and falls back to photo from front matter", () => {
    const withImage = parseRecipeContent(`---\ntitle: A\nimage: https://img/a.jpg\nphoto: https://img/b.jpg\n---\nStep`);
    expect(withImage.image).toBe("https://img/a.jpg");

    const withPhoto = parseRecipeContent(`---\ntitle: B\nphoto: https://img/b.jpg\n---\nStep`);
    expect(withPhoto.image).toBe("https://img/b.jpg");
  });

  it("falls back servings to 1 when front matter servings is invalid", () => {
    const parsed = parseRecipeContent(`---\ntitle: A\nservings: 0\n---\nStep`);
    expect(parsed.servingsBase).toBe(1);
  });

  it("tokenizes text before and after inline markers", () => {
    const tokens = tokenizeStepText("Start @salt{1%g} end", []);
    expect(tokens[0]).toEqual({ kind: "text", text: "Start " });
    expect(tokens[tokens.length - 1]).toEqual({ kind: "text", text: " end" });
  });

  it("uses timer quantity as fallback timer token text", () => {
    const tokens = tokenizeStepText("Wait ~{5%min}", [
      {
        id: "timer-1",
        label: "5 min",
        quantityRaw: "5%min",
        displayQuantity: "5 min",
        seconds: 300,
      },
    ]);
    const timer = tokens.find((token) => token.kind === "timer");
    expect(timer?.text).toBe("5 min");
    expect(timer?.quantityText).toBe("");
  });

  it("formats numbers with finite/integer/decimal behavior", () => {
    expect(formatNumber(Number.NaN)).toBe("");
    expect(formatNumber(2)).toBe("2");
    expect(formatNumber(1.5)).toBe("1.5");
  });

  it("uses lower bound for timer ranges and rejects non-positive results", () => {
    expect(parseTimerSeconds("2-5%min")).toBe(120);
    expect(parseTimerSeconds("=3-5%min")).toBe(180);
    expect(parseTimerSeconds("2-5%sec")).toBe(2);
    expect(parseTimerSeconds("0-5%min")).toBeNull();
    expect(parseTimerSeconds("-1%min")).toBeNull();
  });

  it("ignores metadata lines and parses timer label fallbacks", () => {
    const parsed = parseRecipeContent(
      `>> source: test\nSimmer ~rest{5%min}\nWait ~{5%min}\nIdle ~{}\n@   {1%g}\n#   {1%g}`,
    );
    const instructions = parsed.steps.filter((step) => step.kind === "instruction");
    expect(parsed.steps.some((step) => step.kind === "instruction" && step.text.includes(">> source:"))).toBe(false);
    expect(instructions.length).toBeGreaterThanOrEqual(3);

    const first = instructions[0];
    if (first?.kind === "instruction") {
      expect(first.timers[0].label).toBe("rest");
    }
    const second = instructions[1];
    if (second?.kind === "instruction") {
      expect(second.timers[0].label).toBe("5 min");
    }
    const third = instructions[2];
    if (third?.kind === "instruction") {
      expect(third.timers[0].label).toBe("Timer");
    }
    expect(parsed.ingredients).toHaveLength(0);
    expect(parsed.tools).toHaveLength(0);
  });

  it("preserves separator when stripping inline block comments", () => {
    const parsed = parseRecipeContent(`Mix @olive[-note-]oil{1%g}`);
    expect(parsed.ingredients).toHaveLength(1);
    expect(parsed.ingredients[0].name).toBe("olive oil");
  });

  it("removes line comments instead of turning them into instructions", () => {
    const parsed = parseRecipeContent(`-- internal note\nMix @salt{1%g}`);
    const instructions = parsed.steps.filter((step) => step.kind === "instruction");
    expect(instructions).toHaveLength(1);
    if (instructions[0]?.kind === "instruction") {
      expect(instructions[0].text).toBe("Mix @salt{1%g}");
    }
  });

  it("defaults description and image to empty strings when front matter omits them", () => {
    const parsed = parseRecipeContent(`---\ntitle: Bare\n---\nStep`);
    expect(parsed.description).toBe("");
    expect(parsed.image).toBe("");
  });
});
