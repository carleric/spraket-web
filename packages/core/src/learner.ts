import type { CEFRLevel, LearningGoal, PriorExposure } from "./types.js";
import {
  createSkillEstimate,
  ensureSkillEstimates,
  type SkillEstimate,
} from "./scoring.js";
import type {
  CheckpointProgressRecord,
  LessonProgressRecord,
} from "./path.js";
import type { ReviewItem } from "./review.js";
import type { NorskprovenSkill } from "./types.js";

export interface LearnerState {
  hasCompletedOnboarding: boolean;
  goal: LearningGoal;
  priorExposure: PriorExposure;
  provisionalCEFR: CEFRLevel;
  claimedCEFR?: CEFRLevel;
  placementCompletedAt?: string;
  lessons: LessonProgressRecord[];
  checkpoints: CheckpointProgressRecord[];
  skills: SkillEstimate[];
  reviews: ReviewItem[];
}

export function createInitialLearnerState(
  overrides: Partial<LearnerState> = {},
): LearnerState {
  const skills = (
    ["lese", "lytte", "skrive", "snakke"] as NorskprovenSkill[]
  ).map(createSkillEstimate);
  return {
    hasCompletedOnboarding: false,
    goal: "general",
    priorExposure: "none",
    provisionalCEFR: "A1",
    claimedCEFR: undefined,
    lessons: [],
    checkpoints: [],
    skills: ensureSkillEstimates(skills),
    reviews: [],
    ...overrides,
  };
}

export function upsertLessonProgress(
  lessons: LessonProgressRecord[],
  update: {
    lessonId: string;
    unitId: string;
    accuracy: number;
    completed: boolean;
  },
): LessonProgressRecord[] {
  const next = lessons.map((l) => ({ ...l }));
  const existing = next.find((l) => l.lessonId === update.lessonId);
  const now = new Date().toISOString();
  if (existing) {
    existing.attemptCount += 1;
    existing.accuracy = update.accuracy;
    existing.bestAccuracy = Math.max(existing.bestAccuracy, update.accuracy);
    existing.completed = existing.completed || update.completed;
    existing.lastAttemptAt = now;
    return next;
  }
  next.push({
    lessonId: update.lessonId,
    unitId: update.unitId,
    accuracy: update.accuracy,
    completed: update.completed,
    attemptCount: 1,
    bestAccuracy: update.accuracy,
    lastAttemptAt: now,
  });
  return next;
}

export function upsertCheckpointProgress(
  checkpoints: CheckpointProgressRecord[],
  update: {
    checkpointId: string;
    unitId: string;
    accuracy: number;
    passed: boolean;
    claimSummary?: string;
  },
): CheckpointProgressRecord[] {
  const next = checkpoints.map((c) => ({ ...c }));
  const existing = next.find((c) => c.checkpointId === update.checkpointId);
  const now = new Date().toISOString();
  if (existing) {
    existing.attemptCount += 1;
    existing.lastAccuracy = update.accuracy;
    existing.bestAccuracy = Math.max(existing.bestAccuracy, update.accuracy);
    if (update.passed) {
      existing.passed = true;
      existing.claimedAt = now;
      existing.claimSummary = update.claimSummary;
    }
    return next;
  }
  next.push({
    checkpointId: update.checkpointId,
    unitId: update.unitId,
    passed: update.passed,
    bestAccuracy: update.accuracy,
    lastAccuracy: update.accuracy,
    attemptCount: 1,
    claimSummary: update.passed ? update.claimSummary : undefined,
    claimedAt: update.passed ? now : undefined,
  });
  return next;
}
