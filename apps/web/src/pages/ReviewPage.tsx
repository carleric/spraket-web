import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { grade, type AnswerResult } from "@spraket/core";
import { useApp } from "../store";
import { TabBar } from "../components/TabBar";
import { ExercisePlayer } from "../components/ExercisePlayer";

export function ReviewPage() {
  const { getDueReviews, getExercise, applyReview } = useApp();
  const due = useMemo(() => getDueReviews(), [getDueReviews]);
  const [index, setIndex] = useState(0);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [finished, setFinished] = useState(false);

  if (due.length === 0 || finished) {
    return (
      <div className="app-shell">
        <main className="app-main page-enter stack stack-lg">
          <h1 className="headline">
            {finished ? "Review session done" : "Nothing due"}
          </h1>
          <p className="lede">
            Missed items from lessons land here on an SRS schedule.
          </p>
          <Link to="/practice" className="btn btn-primary" style={{ textAlign: "center" }}>
            Back to practice
          </Link>
        </main>
        <TabBar />
      </div>
    );
  }

  const item = due[index];
  if (!item) {
    return null;
  }
  const exercise = getExercise(item.lessonId, item.exerciseId);

  return (
    <div className="app-shell">
      <main className="app-main page-enter stack">
        <p className="chip">
          Review {index + 1}/{due.length}
        </p>
        <h1 className="headline">Spaced review</h1>
        {exercise ? (
          <>
            <p style={{ fontWeight: 600 }}>{exercise.prompt}</p>
            <ExercisePlayer
              key={item.id}
              exercise={exercise}
              onGraded={(r) => {
                setLastResult(r);
                applyReview(item, r === "correct");
                setAwaitingNext(true);
              }}
            />
          </>
        ) : (
          <TypedFallback
            prompt={item.prompt}
            onGraded={(r) => {
              setLastResult(r);
              applyReview(item, r === "correct");
              setAwaitingNext(true);
            }}
          />
        )}
        {awaitingNext && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setAwaitingNext(false);
              setLastResult(null);
              if (index + 1 >= due.length) {
                setFinished(true);
              } else {
                setIndex((i) => i + 1);
              }
            }}
          >
            {index + 1 >= due.length
              ? "Done"
              : `Continue${lastResult ? "" : ""}`}
          </button>
        )}
      </main>
    </div>
  );
}

function TypedFallback({
  prompt,
  onGraded,
}: {
  prompt: string;
  onGraded: (r: AnswerResult) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="stack">
      <p style={{ fontWeight: 600 }}>{prompt}</p>
      <input
        className="field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => onGraded(grade(value, [value]) === "correct" ? "correct" : "incorrect")}
      >
        Mark self-check
      </button>
    </div>
  );
}
