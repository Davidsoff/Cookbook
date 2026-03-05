export type UnitSystem = "metric" | "us";
export type Tab = "ingredients" | "steps" | "tools" | "shopping" | "meal-plan" | "plan-shopping";

export interface Ingredient {
  name: string;
  quantityRaw: string;
  amountRaw: string;
  unit: string;
  numeric: number | null;
  fixed: boolean;
  preparation: string;
}

export interface Tool {
  name: string;
  quantityRaw: string;
  amountRaw: string;
  unit: string;
  numeric: number | null;
}

export interface StepTimer {
  id: string;
  label: string;
  quantityRaw: string;
  displayQuantity: string;
  seconds: number | null;
}

export interface StepInstruction {
  kind: "instruction";
  text: string;
  timers: StepTimer[];
}

export interface StepNote {
  kind: "note";
  text: string;
  timers: [];
}

export interface StepSection {
  kind: "section";
  text: string;
  timers: [];
}

export type Step = StepInstruction | StepNote | StepSection;

export interface ParsedRecipe {
  title: string;
  description: string;
  image: string;
  servingsBase: number;
  ingredients: Ingredient[];
  tools: Tool[];
  steps: Step[];
}

export interface Recipe {
  name: string;
  path: string;
  content: string;
  parsed: ParsedRecipe;
}

export interface RunningTimer {
  id: string;
  label: string;
  endsAt: number;
  intervalId: number;
  timeoutId: number;
}
