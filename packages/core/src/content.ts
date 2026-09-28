import type { CEFRLevel, ExerciseKind, NorskprovenSkill } from "./types.js";

/** Versioned lesson pack (JSON). */
export interface LessonPack {
  version: number;
  track: string;
  units: ContentUnit[];
}

export interface ContentUnit {
  id: string;
  title: string;
  theme: string;
  cefr: CEFRLevel;
  grammarFocus: string;
  /** Band this unit's checkpoint can claim for tagged skills. */
  claimTarget?: CEFRLevel;
  lessons: ContentLesson[];
  checkpoint?: ContentCheckpoint;
}

export interface ContentCheckpoint {
  id: string;
  title: string;
  norskprovenSkills: NorskprovenSkill[];
  exercises: ContentExercise[];
}

export interface ContentLesson {
  id: string;
  title: string;
  microSkill: string;
  cefrTarget: CEFRLevel;
  norskprovenSkills: NorskprovenSkill[];
  canDoIds: string[];
  exercises: ContentExercise[];
}

export interface MatchPair {
  id: string;
  left: string;
  right: string;
}

export interface ContentExercise {
  id: string;
  kind: ExerciseKind;
  prompt: string;
  promptNO?: string;
  skills: NorskprovenSkill[];
  audioText?: string;
  audioRef?: string;
  choices?: string[];
  wordBank?: string[];
  pairs?: MatchPair[];
  orderTokens?: string[];
  /** Accepted answers (morphology / orthography variants). */
  accept: string[];
  explanation?: string;
  passage?: string;
}

export type PathNextItem =
  | { kind: "lesson"; unitId: string; lessonId: string }
  | { kind: "checkpoint"; unitId: string; checkpointId: string };

export const BUNDLED_PACK_NAMES = [
  "a1-greetings",
  "a1-numbers",
  "a1-food",
  "a2-daily",
  "a2-shopping",
  "a2-travel",
  "b1-opinions",
  "b1-work",
] as const;
