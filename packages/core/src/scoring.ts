import type { ContentCheckpoint, ContentUnit } from "./content.js";
import type { CEFRLevel, LearningGoal, NorskprovenSkill } from "./types.js";
import { maxCefr, minCefr } from "./types.js";

export const LESSON_PASS_THRESHOLD = 0.8;
export const EMA_ALPHA = 0.3;
export const CHECKPOINT_WEIGHT = 0.55;
export const MIN_EVIDENCE_FOR_CLAIM = 5;

export interface SkillEstimate {
  skill: NorskprovenSkill;
  emaScore: number;
  sampleCount: number;
  provisionalBand: CEFRLevel;
  claimedBand?: CEFRLevel;
  checkpointPassed: boolean;
  lastUpdatedAt: string;
  /** Productive skills stay estimated until stronger rubric exists. */
  estimatedOnly: boolean;
}

export interface CheckpointClaimResult {
  passed: boolean;
  accuracy: number;
  claimTarget: CEFRLevel;
  claimedSkills: NorskprovenSkill[];
  estimatedOnlySkills: NorskprovenSkill[];
  overallClaimed?: CEFRLevel;
  claimSummary: string;
  skills: SkillEstimate[];
}

export function createSkillEstimate(skill: NorskprovenSkill): SkillEstimate {
  return {
    skill,
    emaScore: 0,
    sampleCount: 0,
    provisionalBand: "A1",
    claimedBand: undefined,
    checkpointPassed: false,
    lastUpdatedAt: new Date().toISOString(),
    estimatedOnly: skill === "skrive" || skill === "snakke",
  };
}

export function ensureSkillEstimates(
  skills: SkillEstimate[],
): SkillEstimate[] {
  const have = new Set(skills.map((s) => s.skill));
  const next = [...skills];
  for (const skill of ["lese", "lytte", "skrive", "snakke"] as NorskprovenSkill[]) {
    if (!have.has(skill)) next.push(createSkillEstimate(skill));
  }
  return next;
}

export function bandForScore(score: number): CEFRLevel {
  if (score >= 0.92) return "B1";
  if (score >= 0.8) return "A2";
  return "A1";
}

export function confidenceLabel(sampleCount: number): string {
  if (sampleCount < 3) return "low confidence";
  if (sampleCount < 8) return "building confidence";
  return "stable";
}

function applyEma(accuracy: number, row: SkillEstimate, alpha = EMA_ALPHA): void {
  if (row.sampleCount === 0) {
    row.emaScore = accuracy;
  } else {
    row.emaScore = alpha * accuracy + (1 - alpha) * row.emaScore;
  }
  row.sampleCount += 1;
  row.lastUpdatedAt = new Date().toISOString();
  row.provisionalBand = bandForScore(row.emaScore);
}

export function overallProvisional(
  skills: SkillEstimate[],
  goal: LearningGoal,
): CEFRLevel {
  const relevant =
    goal === "travel"
      ? skills.filter((s) => s.skill === "lese" || s.skill === "lytte")
      : skills;
  const bands = relevant.map((s) => s.provisionalBand);
  return bands.reduce((a, b) => minCefr(a, b), bands[0] ?? "A1");
}

export function overallClaimed(
  skills: SkillEstimate[],
  goal: LearningGoal,
): CEFRLevel | undefined {
  const relevant =
    goal === "travel"
      ? skills.filter((s) => s.skill === "lese" || s.skill === "lytte")
      : skills.filter((s) => !s.estimatedOnly);
  const bands = relevant
    .map((s) => s.claimedBand)
    .filter((b): b is CEFRLevel => Boolean(b));
  if (bands.length === 0) return undefined;
  return bands.reduce((a, b) => minCefr(a, b));
}

export function recordLessonResult(
  skills: SkillEstimate[],
  lesson: { norskprovenSkills: NorskprovenSkill[] },
  accuracy: number,
): SkillEstimate[] {
  const next = ensureSkillEstimates(skills).map((s) => ({ ...s }));
  for (const tag of lesson.norskprovenSkills) {
    const row = next.find((s) => s.skill === tag);
    if (row) applyEma(accuracy, row);
  }
  return next;
}

/** Formative weak-area drill — updates EMA only; never claims bands. */
export function recordPracticeResult(
  skills: SkillEstimate[],
  skill: NorskprovenSkill,
  accuracy: number,
): SkillEstimate[] {
  const next = ensureSkillEstimates(skills).map((s) => ({ ...s }));
  const row = next.find((s) => s.skill === skill);
  if (row) applyEma(accuracy, row);
  return next;
}

export function recordCheckpointResult(
  skills: SkillEstimate[],
  unit: ContentUnit,
  checkpoint: ContentCheckpoint,
  accuracy: number,
  goal: LearningGoal,
  previousOverallClaimed?: CEFRLevel,
): CheckpointClaimResult {
  const next = ensureSkillEstimates(skills).map((s) => ({ ...s }));
  const passed = accuracy >= LESSON_PASS_THRESHOLD;
  const target = unit.claimTarget ?? unit.cefr;

  const claimedSkills: NorskprovenSkill[] = [];
  const estimatedOnlySkills: NorskprovenSkill[] = [];

  const tagged = new Set(checkpoint.norskprovenSkills);
  for (const ex of checkpoint.exercises) {
    for (const s of ex.skills) tagged.add(s);
  }

  for (const skill of tagged) {
    const estimate = next.find((s) => s.skill === skill);
    if (!estimate) continue;
    if (estimate.sampleCount === 0) {
      estimate.emaScore = accuracy;
    } else {
      estimate.emaScore =
        CHECKPOINT_WEIGHT * accuracy +
        (1 - CHECKPOINT_WEIGHT) * estimate.emaScore;
    }
    const taggedCount = checkpoint.exercises.filter((e) =>
      e.skills.includes(skill),
    ).length;
    estimate.sampleCount += Math.max(2, taggedCount);
    estimate.lastUpdatedAt = new Date().toISOString();
    estimate.provisionalBand = maxCefr(
      estimate.provisionalBand,
      bandForScore(estimate.emaScore),
    );

    if (passed) {
      estimate.checkpointPassed = true;
      if (estimate.estimatedOnly) {
        estimatedOnlySkills.push(skill);
      } else if (
        estimate.sampleCount >= MIN_EVIDENCE_FOR_CLAIM &&
        estimate.emaScore >= LESSON_PASS_THRESHOLD &&
        cefrAtLeast(estimate.provisionalBand, target)
      ) {
        const newClaim = estimate.claimedBand
          ? maxCefr(estimate.claimedBand, target)
          : target;
        estimate.claimedBand = minCefr(newClaim, target);
        claimedSkills.push(skill);
      }
    }
  }

  let overall: CEFRLevel | undefined;
  let claimSummary = `Target ${target}`;
  if (passed) {
    overall = overallClaimed(next, goal);
    if (overall && previousOverallClaimed) {
      overall = maxCefr(previousOverallClaimed, overall);
    } else if (!overall) {
      overall = previousOverallClaimed;
    }
    const claimParts = claimedSkills.map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1),
    );
    const estParts = estimatedOnlySkills.map(
      (s) => s.charAt(0).toUpperCase() + s.slice(1),
    );
    if (claimParts.length) {
      claimSummary += ` · claimed ${claimParts.join(", ")}`;
    }
    if (estParts.length) {
      claimSummary += ` · ${estParts.join(", ")} estimated only`;
    }
    if (!claimParts.length && !estParts.length) {
      claimSummary += " · not enough evidence yet for claim";
    }
  }

  return {
    passed,
    accuracy,
    claimTarget: target,
    claimedSkills,
    estimatedOnlySkills,
    overallClaimed: overall,
    claimSummary,
    skills: next,
  };
}

function cefrAtLeast(a: CEFRLevel, b: CEFRLevel): boolean {
  return maxCefr(a, b) === a;
}
