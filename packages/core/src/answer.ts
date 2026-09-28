import type { AnswerResult } from "./types.js";
import type { MatchPair } from "./content.js";

/** Normalize for Bokmål comparison: lowercase, trim, collapse whitespace, strip punctuation edges. */
export function normalize(raw: string): string {
  const lowered = raw.toLowerCase().trim();
  const collapsed = lowered.replace(/\s+/g, " ");
  return collapsed.replace(/^[.,!?;:"'«»]+|[.,!?;:"'«»]+$/g, "");
}

export function grade(userAnswer: string, accept: string[]): AnswerResult {
  const answer = normalize(userAnswer);
  if (!answer) return "incorrect";
  const accepted = accept.map(normalize);
  if (accepted.includes(answer)) return "correct";

  // Light partial credit: all tokens present ignoring order (word-bank style tolerance).
  const answerTokens = new Set(answer.split(" ").filter(Boolean));
  for (const candidate of accepted) {
    const candidateTokens = new Set(candidate.split(" ").filter(Boolean));
    if (candidateTokens.size === 0) continue;
    let subset = true;
    for (const t of candidateTokens) {
      if (!answerTokens.has(t)) {
        subset = false;
        break;
      }
    }
    if (subset) {
      return answerTokens.size === candidateTokens.size ? "correct" : "partial";
    }
  }
  return "incorrect";
}

export function gradeChoice(choice: string, accept: string[]): AnswerResult {
  return grade(choice, accept);
}

export function gradeOrdered(tokens: string[], accept: string[]): AnswerResult {
  return grade(tokens.join(" "), accept);
}

export function gradePairs(
  user: Record<string, string>,
  expected: MatchPair[],
): AnswerResult {
  if (expected.length === 0) return "incorrect";
  let correct = 0;
  for (const pair of expected) {
    if (user[pair.left] === pair.right) correct += 1;
  }
  if (correct === expected.length) return "correct";
  if (correct > 0) return "partial";
  return "incorrect";
}

export function scoreValue(result: AnswerResult): number {
  switch (result) {
    case "correct":
      return 1;
    case "partial":
      return 0.5;
    case "incorrect":
      return 0;
  }
}

export function sessionAccuracy(results: AnswerResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + scoreValue(r), 0);
  return sum / results.length;
}
