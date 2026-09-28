import type { CEFRLevel, PriorExposure } from "./types.js";
import { gradeChoice } from "./answer.js";

export interface PlacementItem {
  id: string;
  prompt: string;
  choices: string[];
  accept: string;
}

/** Short receptive-heavy placement stub (ported from iOS onboarding). */
export const PLACEMENT_ITEMS: PlacementItem[] = [
  {
    id: "p1",
    prompt: "What does «hei» mean?",
    choices: ["bye", "hi", "please", "water"],
    accept: "hi",
  },
  {
    id: "p2",
    prompt: "«Takk» means…",
    choices: ["thanks", "sorry", "yes", "no"],
    accept: "thanks",
  },
  {
    id: "p3",
    prompt: "Complete: Jeg ___ Nora.",
    choices: ["er", "heter", "har", "går"],
    accept: "heter",
  },
  {
    id: "p4",
    prompt: "«God morgen» is…",
    choices: ["good night", "good morning", "goodbye", "excuse me"],
    accept: "good morning",
  },
];

export function gradePlacementChoice(
  item: PlacementItem,
  choice: string,
): boolean {
  return gradeChoice(choice, [item.accept]) === "correct";
}

/**
 * Map placement accuracy + prior exposure → provisional CEFR.
 * Conservative: brand-new learners stay A1 unless nearly perfect.
 */
export function provisionalFromPlacement(
  correctCount: number,
  total: number,
  prior: PriorExposure,
): CEFRLevel {
  const accuracy = total === 0 ? 0 : correctCount / total;
  if (prior === "conversational" && accuracy >= 0.75) return "A2";
  if (prior === "someLessons" && accuracy >= 0.75) return "A2";
  if (accuracy >= 1 && prior !== "none") return "A2";
  if (accuracy >= 0.5) return "A1";
  return "A1";
}
