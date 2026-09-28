export interface ReviewItem {
  id: string;
  lessonId: string;
  exerciseId: string;
  prompt: string;
  dueAt: string;
  ease: number;
  intervalDays: number;
  repetitions: number;
}

export function makeReviewId(lessonId: string, exerciseId: string): string {
  return `${lessonId}:${exerciseId}`;
}

/** Misses become due immediately so the review player is usable in-session. */
export function enqueueMiss(
  items: ReviewItem[],
  lessonId: string,
  exerciseId: string,
  prompt: string,
  now = new Date(),
): ReviewItem[] {
  const id = makeReviewId(lessonId, exerciseId);
  const next = items.map((i) => ({ ...i }));
  const existing = next.find((i) => i.id === id);
  if (existing) {
    existing.dueAt = now.toISOString();
    existing.prompt = prompt;
    existing.intervalDays = 0;
    return next;
  }
  next.push({
    id,
    lessonId,
    exerciseId,
    prompt,
    dueAt: now.toISOString(),
    ease: 2.5,
    intervalDays: 0,
    repetitions: 0,
  });
  return next;
}

/** Lightweight SM-2-ish scheduling. */
export function applyReviewResult(
  item: ReviewItem,
  correct: boolean,
  now = new Date(),
): ReviewItem {
  const next = { ...item };
  if (correct) {
    next.repetitions += 1;
    if (next.intervalDays <= 0) {
      next.intervalDays = 1;
    } else if (next.intervalDays === 1) {
      next.intervalDays = 3;
    } else {
      next.intervalDays = Math.round(next.intervalDays * next.ease);
    }
    next.ease = Math.min(3.0, next.ease + 0.05);
    next.dueAt = new Date(
      now.getTime() + next.intervalDays * 24 * 60 * 60 * 1000,
    ).toISOString();
  } else {
    next.repetitions = 0;
    next.intervalDays = 0;
    next.ease = Math.max(1.3, next.ease - 0.2);
    next.dueAt = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
  }
  return next;
}

export function dueReviews(
  items: ReviewItem[],
  now = new Date(),
): ReviewItem[] {
  const t = now.getTime();
  return items
    .filter((i) => new Date(i.dueAt).getTime() <= t)
    .sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
    );
}
