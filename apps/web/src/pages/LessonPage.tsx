import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { findLesson, type AnswerResult } from "@spraket/core";
import { useApp } from "../store";
import { ExercisePlayer } from "../components/ExercisePlayer";

export function LessonPage() {
  const { unitId = "", lessonId = "" } = useParams();
  const { pack, finishLesson } = useApp();
  const navigate = useNavigate();
  const found = findLesson(pack, lessonId);
  const exercises = found?.lesson.exercises ?? [];
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [misses, setMisses] = useState<
    { exerciseId: string; prompt: string }[]
  >([]);
  const [done, setDone] = useState<{
    passed: boolean;
    accuracy: number;
  } | null>(null);
  const [awaitingNext, setAwaitingNext] = useState(false);

  const progressPct = useMemo(() => {
    if (!exercises.length) return 0;
    const completed = results.length;
    return Math.min(100, (completed / exercises.length) * 100);
  }, [results.length, exercises.length]);

  if (!found || found.unit.id !== unitId) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <p>Lesson not found.</p>
          <Link to="/path">Back to path</Link>
        </main>
      </div>
    );
  }

  const exercise = exercises[index];

  function onGraded(result: AnswerResult) {
    if (!exercise) return;
    setResults((r) => [...r, result]);
    if (result !== "correct") {
      setMisses((m) => [
        ...m,
        { exerciseId: exercise.id, prompt: exercise.prompt },
      ]);
    }
    setAwaitingNext(true);
  }

  function continueAfterFeedback() {
    if (index + 1 >= exercises.length) {
      // results already includes the last grade from this render cycle
      const outcome = finishLesson({
        lessonId,
        unitId,
        results,
        misses,
      });
      setDone(outcome);
      setAwaitingNext(false);
      return;
    }
    setAwaitingNext(false);
    setIndex((i) => i + 1);
  }

  if (done) {
    return (
      <div className="app-shell">
        <main className="app-main page-enter stack stack-lg">
          <p className="brand" style={{ fontSize: "1.5rem", margin: 0 }}>
            Språket
          </p>
          <h1 className="headline">
            {done.passed ? "Lesson passed" : "Keep practicing"}
          </h1>
          <p className="lede">
            Accuracy {Math.round(done.accuracy * 100)}%
            {done.passed
              ? " — next lesson unlocked."
              : " — need 80% to unlock the next lesson. Retry anytime."}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/path")}
          >
            Back to path
          </button>
          {!done.passed && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setIndex(0);
                setResults([]);
                setMisses([]);
                setDone(null);
              }}
            >
              Retry lesson
            </button>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-main page-enter stack">
        <div>
          <p className="muted" style={{ margin: 0 }}>
            {found.unit.title}
          </p>
          <h1 className="headline">{found.lesson.title}</h1>
        </div>
        <div className="progress-rail">
          <span style={{ width: `${progressPct}%` }} />
        </div>
        {exercise && (
          <>
            <p style={{ fontWeight: 600 }}>{exercise.prompt}</p>
            <ExercisePlayer
              key={exercise.id}
              exercise={exercise}
              onGraded={onGraded}
            />
          </>
        )}
        {awaitingNext && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={continueAfterFeedback}
          >
            {index + 1 >= exercises.length ? "See results" : "Continue"}
          </button>
        )}
      </main>
    </div>
  );
}
