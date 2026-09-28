import type { ContentExercise, LessonPack } from "./content.js";
import type { NorskprovenSkill } from "./types.js";
import type { SkillEstimate } from "./scoring.js";

export const DEFAULT_PRACTICE_SESSION_SIZE = 8;

export interface TaggedExercise {
  id: string;
  lessonId: string;
  unitId: string;
  exercise: ContentExercise;
}

export function rankedSkills(skills: SkillEstimate[]): SkillEstimate[] {
  return skills
    .filter((s) => s.sampleCount > 0)
    .sort((a, b) => {
      if (a.emaScore !== b.emaScore) return a.emaScore - b.emaScore;
      return a.sampleCount - b.sampleCount;
    });
}

export function practicePool(
  skill: NorskprovenSkill,
  pack: LessonPack,
  completedLessonIds: Set<string> = new Set(),
): TaggedExercise[] {
  const items: TaggedExercise[] = [];
  for (const unit of pack.units) {
    for (const lesson of unit.lessons) {
      for (const exercise of lesson.exercises) {
        if (exercise.skills.includes(skill)) {
          items.push({
            id: `${lesson.id}:${exercise.id}`,
            lessonId: lesson.id,
            unitId: unit.id,
            exercise,
          });
        }
      }
    }
  }
  const fromCompleted = items.filter((i) =>
    completedLessonIds.has(i.lessonId),
  );
  const source = fromCompleted.length >= 4 ? fromCompleted : items;
  return shuffle(source);
}

export function practiceSession(
  skill: NorskprovenSkill,
  pack: LessonPack,
  completedLessonIds: Set<string> = new Set(),
  size = DEFAULT_PRACTICE_SESSION_SIZE,
): TaggedExercise[] {
  return practicePool(skill, pack, completedLessonIds).slice(0, size);
}

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}
