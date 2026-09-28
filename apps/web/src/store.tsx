import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LESSON_PASS_THRESHOLD,
  applyReviewResult,
  createInitialLearnerState,
  dueReviews,
  enqueueMiss,
  findCheckpoint,
  findLesson,
  lockState,
  maxCefr,
  nextPathItem,
  overallProvisional,
  practiceSession,
  provisionalFromPlacement,
  rankedSkills,
  recordCheckpointResult,
  recordLessonResult,
  recordPracticeResult,
  upsertCheckpointProgress,
  upsertLessonProgress,
  type AnswerResult,
  type ContentExercise,
  type LearningGoal,
  type LearnerState,
  type LessonPack,
  type NorskprovenSkill,
  type PriorExposure,
  type ReviewItem,
  type TaggedExercise,
} from "@spraket/core";
import { loadBundledPack } from "./contentLoader";

const STORAGE_KEY = "spraket.learner.v1";

interface AppContextValue {
  pack: LessonPack;
  state: LearnerState;
  dueCount: number;
  nextItem: ReturnType<typeof nextPathItem>;
  completeOnboarding: (input: {
    goal: LearningGoal;
    prior: PriorExposure;
    placementCorrect: number;
    placementTotal: number;
    skipped: boolean;
  }) => void;
  finishLesson: (input: {
    lessonId: string;
    unitId: string;
    results: AnswerResult[];
    misses: { exerciseId: string; prompt: string }[];
  }) => { passed: boolean; accuracy: number };
  finishCheckpoint: (input: {
    unitId: string;
    checkpointId: string;
    results: AnswerResult[];
  }) => ReturnType<typeof recordCheckpointResult>;
  finishPractice: (skill: NorskprovenSkill, accuracy: number) => void;
  applyReview: (item: ReviewItem, correct: boolean) => void;
  getDueReviews: () => ReviewItem[];
  getExercise: (
    lessonId: string,
    exerciseId: string,
  ) => ContentExercise | undefined;
  buildPractice: (skill: NorskprovenSkill) => TaggedExercise[];
  weakestSkills: ReturnType<typeof rankedSkills>;
  lessonLock: (
    lessonId: string,
  ) => "locked" | "unlocked" | "completed" | "unknown";
  resetAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadState(): LearnerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialLearnerState();
    return { ...createInitialLearnerState(), ...JSON.parse(raw) };
  } catch {
    return createInitialLearnerState();
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const pack = useMemo(() => loadBundledPack(), []);
  const [state, setState] = useState<LearnerState>(() => loadState());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const dueCount = dueReviews(state.reviews).length;
  const nextItem = nextPathItem(pack, state.lessons, state.checkpoints);

  const completeOnboarding = useCallback(
    (input: {
      goal: LearningGoal;
      prior: PriorExposure;
      placementCorrect: number;
      placementTotal: number;
      skipped: boolean;
    }) => {
      const provisional = input.skipped
        ? ("A1" as const)
        : provisionalFromPlacement(
            input.placementCorrect,
            input.placementTotal,
            input.prior,
          );
      setState((prev) => ({
        ...prev,
        hasCompletedOnboarding: true,
        goal: input.goal,
        priorExposure: input.prior,
        provisionalCEFR: provisional,
        placementCompletedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  const finishLesson = useCallback(
    (input: {
      lessonId: string;
      unitId: string;
      results: AnswerResult[];
      misses: { exerciseId: string; prompt: string }[];
    }) => {
      const accuracy =
        input.results.length === 0
          ? 0
          : input.results.reduce((a, r) => {
              if (r === "correct") return a + 1;
              if (r === "partial") return a + 0.5;
              return a;
            }, 0) / input.results.length;
      const passed = accuracy >= LESSON_PASS_THRESHOLD;
      const lesson = findLesson(pack, input.lessonId)?.lesson;
      setState((prev) => {
        let reviews = prev.reviews;
        for (const miss of input.misses) {
          reviews = enqueueMiss(
            reviews,
            input.lessonId,
            miss.exerciseId,
            miss.prompt,
          );
        }
        const skills = lesson
          ? recordLessonResult(prev.skills, lesson, accuracy)
          : prev.skills;
        const provisional = maxCefr(
          prev.provisionalCEFR,
          overallProvisional(skills, prev.goal),
        );
        return {
          ...prev,
          lessons: upsertLessonProgress(prev.lessons, {
            lessonId: input.lessonId,
            unitId: input.unitId,
            accuracy,
            completed: passed,
          }),
          skills,
          reviews,
          provisionalCEFR: provisional,
        };
      });
      return { passed, accuracy };
    },
    [pack],
  );

  const finishCheckpoint = useCallback(
    (input: {
      unitId: string;
      checkpointId: string;
      results: AnswerResult[];
    }) => {
      const accuracy =
        input.results.length === 0
          ? 0
          : input.results.reduce((a, r) => {
              if (r === "correct") return a + 1;
              if (r === "partial") return a + 0.5;
              return a;
            }, 0) / input.results.length;
      const found = findCheckpoint(pack, input.unitId);
      if (!found) {
        return {
          passed: false,
          accuracy,
          claimTarget: "A1" as const,
          claimedSkills: [],
          estimatedOnlySkills: [],
          claimSummary: "",
          skills: state.skills,
        };
      }
      let claimResult!: ReturnType<typeof recordCheckpointResult>;
      setState((prev) => {
        claimResult = recordCheckpointResult(
          prev.skills,
          found.unit,
          found.checkpoint,
          accuracy,
          prev.goal,
          prev.claimedCEFR,
        );
        const provisional = maxCefr(
          prev.provisionalCEFR,
          overallProvisional(claimResult.skills, prev.goal),
        );
        return {
          ...prev,
          skills: claimResult.skills,
          checkpoints: upsertCheckpointProgress(prev.checkpoints, {
            checkpointId: input.checkpointId,
            unitId: input.unitId,
            accuracy,
            passed: claimResult.passed,
            claimSummary: claimResult.claimSummary,
          }),
          provisionalCEFR: provisional,
          claimedCEFR: claimResult.overallClaimed ?? prev.claimedCEFR,
        };
      });
      return claimResult;
    },
    [pack, state.skills],
  );

  const finishPractice = useCallback(
    (skill: NorskprovenSkill, accuracy: number) => {
      setState((prev) => {
        const skills = recordPracticeResult(prev.skills, skill, accuracy);
        return {
          ...prev,
          skills,
          provisionalCEFR: maxCefr(
            prev.provisionalCEFR,
            overallProvisional(skills, prev.goal),
          ),
        };
      });
    },
    [],
  );

  const applyReview = useCallback((item: ReviewItem, correct: boolean) => {
    setState((prev) => ({
      ...prev,
      reviews: prev.reviews.map((r) =>
        r.id === item.id ? applyReviewResult(r, correct) : r,
      ),
    }));
  }, []);

  const getDueReviews = useCallback(
    () => dueReviews(state.reviews),
    [state.reviews],
  );

  const getExercise = useCallback(
    (lessonId: string, exerciseId: string) => {
      const found = findLesson(pack, lessonId);
      return found?.lesson.exercises.find((e) => e.id === exerciseId);
    },
    [pack],
  );

  const buildPractice = useCallback(
    (skill: NorskprovenSkill) => {
      const completed = new Set(
        state.lessons.filter((l) => l.completed).map((l) => l.lessonId),
      );
      return practiceSession(skill, pack, completed);
    },
    [pack, state.lessons],
  );

  const weakestSkills = useMemo(
    () => rankedSkills(state.skills),
    [state.skills],
  );

  const lessonLock = useCallback(
    (lessonId: string) => {
      const found = findLesson(pack, lessonId);
      if (!found) return "unknown";
      return lockState(pack, found.lesson, found.unit, state.lessons);
    },
    [pack, state.lessons],
  );

  const resetAll = useCallback(() => {
    setState(createInitialLearnerState());
  }, []);

  const value: AppContextValue = {
    pack,
    state,
    dueCount,
    nextItem,
    completeOnboarding,
    finishLesson,
    finishCheckpoint,
    finishPractice,
    applyReview,
    getDueReviews,
    getExercise,
    buildPractice,
    weakestSkills,
    lessonLock,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
