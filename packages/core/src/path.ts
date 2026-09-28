import type {
  ContentCheckpoint,
  ContentLesson,
  ContentUnit,
  LessonPack,
} from "./content.js";
import type { PathNextItem } from "./content.js";
import type { LessonLockState } from "./types.js";

export interface LessonProgressRecord {
  lessonId: string;
  unitId: string;
  accuracy: number;
  completed: boolean;
  attemptCount: number;
  bestAccuracy: number;
  lastAttemptAt?: string;
}

export interface CheckpointProgressRecord {
  checkpointId: string;
  unitId: string;
  passed: boolean;
  bestAccuracy: number;
  lastAccuracy: number;
  attemptCount: number;
  claimSummary?: string;
  claimedAt?: string;
}

export function mergePacks(
  packs: LessonPack[],
): LessonPack {
  if (packs.length === 0) {
    return { version: 1, track: "Bokmål", units: [] };
  }
  let version = 1;
  let track = packs[0]!.track;
  const units: LessonPack["units"] = [];
  for (const pack of packs) {
    version = Math.max(version, pack.version);
    track = pack.track;
    units.push(...pack.units);
  }
  return { version, track, units };
}

export function findLesson(
  pack: LessonPack,
  lessonId: string,
): { unit: ContentUnit; lesson: ContentLesson } | undefined {
  for (const unit of pack.units) {
    const lesson = unit.lessons.find((l) => l.id === lessonId);
    if (lesson) return { unit, lesson };
  }
  return undefined;
}

export function findCheckpoint(
  pack: LessonPack,
  unitId: string,
): { unit: ContentUnit; checkpoint: ContentCheckpoint } | undefined {
  const unit = pack.units.find((u) => u.id === unitId);
  if (!unit?.checkpoint) return undefined;
  return { unit, checkpoint: unit.checkpoint };
}

export function nextLesson(
  pack: LessonPack,
  progress: LessonProgressRecord[],
): { unit: ContentUnit; lesson: ContentLesson } | undefined {
  const completed = new Set(
    progress.filter((p) => p.completed).map((p) => p.lessonId),
  );
  for (const unit of pack.units) {
    for (const lesson of unit.lessons) {
      if (!completed.has(lesson.id)) return { unit, lesson };
    }
  }
  return undefined;
}

export function nextPathItem(
  pack: LessonPack,
  progress: LessonProgressRecord[],
  checkpoints: CheckpointProgressRecord[],
): PathNextItem | undefined {
  const next = nextLesson(pack, progress);
  if (next) {
    return {
      kind: "lesson",
      unitId: next.unit.id,
      lessonId: next.lesson.id,
    };
  }
  const completedLessons = new Set(
    progress.filter((p) => p.completed).map((p) => p.lessonId),
  );
  const passedCheckpoints = new Set(
    checkpoints.filter((c) => c.passed).map((c) => c.checkpointId),
  );
  for (const unit of pack.units) {
    const lessonsDone = unit.lessons.every((l) =>
      completedLessons.has(l.id),
    );
    if (!lessonsDone || !unit.checkpoint) continue;
    if (!passedCheckpoints.has(unit.checkpoint.id)) {
      return {
        kind: "checkpoint",
        unitId: unit.id,
        checkpointId: unit.checkpoint.id,
      };
    }
  }
  return undefined;
}

export function isUnitLessonsComplete(
  unit: ContentUnit,
  progress: LessonProgressRecord[],
): boolean {
  const completed = new Set(
    progress.filter((p) => p.completed).map((p) => p.lessonId),
  );
  return unit.lessons.every((l) => completed.has(l.id));
}

export function lockState(
  pack: LessonPack,
  lesson: ContentLesson,
  unit: ContentUnit,
  progress: LessonProgressRecord[],
): LessonLockState {
  const completed = new Set(
    progress.filter((p) => p.completed).map((p) => p.lessonId),
  );
  if (completed.has(lesson.id)) return "completed";
  const index = unit.lessons.findIndex((l) => l.id === lesson.id);
  if (index < 0) return "locked";
  if (index === 0) {
    const unitIndex = pack.units.findIndex((u) => u.id === unit.id);
    if (unitIndex > 0) {
      const prev = pack.units[unitIndex - 1]!;
      const prevDone = prev.lessons.every((l) => completed.has(l.id));
      return prevDone ? "unlocked" : "locked";
    }
    return "unlocked";
  }
  const prevId = unit.lessons[index - 1]!.id;
  return completed.has(prevId) ? "unlocked" : "locked";
}
