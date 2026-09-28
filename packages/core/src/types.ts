/** CEFR levels used for overall competence and skill bands. */
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function cefrRank(level: CEFRLevel): number {
  return CEFR_LEVELS.indexOf(level);
}

export function maxCefr(a: CEFRLevel, b: CEFRLevel): CEFRLevel {
  return cefrRank(a) >= cefrRank(b) ? a : b;
}

export function minCefr(a: CEFRLevel, b: CEFRLevel): CEFRLevel {
  return cefrRank(a) <= cefrRank(b) ? a : b;
}

/** Norskprøven skill dimensions. */
export type NorskprovenSkill = "lese" | "lytte" | "skrive" | "snakke";

export const NORSKPROVEN_SKILLS: NorskprovenSkill[] = [
  "lese",
  "lytte",
  "skrive",
  "snakke",
];

export function skillDisplayName(skill: NorskprovenSkill): string {
  switch (skill) {
    case "lese":
      return "Lese (reading)";
    case "lytte":
      return "Lytte (listening)";
    case "skrive":
      return "Skrive (writing)";
    case "snakke":
      return "Snakke (speaking)";
  }
}

export function skillShortName(skill: NorskprovenSkill): string {
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}

export type LearningGoal = "travel" | "work" | "norskproven" | "general";

export const LEARNING_GOALS: {
  id: LearningGoal;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "travel",
    title: "Travel",
    subtitle: "Survive greetings, food, directions",
  },
  {
    id: "work",
    title: "Work",
    subtitle: "Workplace phrases and email basics",
  },
  {
    id: "norskproven",
    title: "Norskprøven",
    subtitle: "Aligned to exam skill bands",
  },
  {
    id: "general",
    title: "General",
    subtitle: "Balanced everyday Bokmål",
  },
];

export type PriorExposure =
  | "none"
  | "someWords"
  | "someLessons"
  | "conversational";

export const PRIOR_EXPOSURES: { id: PriorExposure; title: string }[] = [
  { id: "none", title: "Brand new" },
  { id: "someWords", title: "A few words" },
  { id: "someLessons", title: "Some lessons before" },
  { id: "conversational", title: "Can hold a simple chat" },
];

export type LessonLockState = "locked" | "unlocked" | "completed";

export type ExerciseKind =
  | "translate"
  | "listenChoose"
  | "readAnswer"
  | "fillBlank"
  | "matchPairs"
  | "orderWords"
  | "dictation"
  | "speakCompare";

export type AnswerResult = "correct" | "partial" | "incorrect";

export function norskprovenLabel(level: CEFRLevel): string {
  if (level === "C1" || level === "C2") return `— (CEFR ${level})`;
  return level;
}
