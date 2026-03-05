import { describe, expect, it } from "vitest";
import {
  parseQuantitySpec,
  parseRecipeContent,
  parseCooklangNumber,
  parseTimerSeconds,
  tokenizeStepText,
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
  });

  it("parses sections and notes", () => {
    const parsed = parseRecipeContent(`= Sauce =\n> Stir gently\nMix @water{1%cup}`);
    expect(parsed.steps[0].kind).toBe("section");
    expect(parsed.steps[1].kind).toBe("note");
    expect(parsed.steps[2].kind).toBe("instruction");
  });
});
