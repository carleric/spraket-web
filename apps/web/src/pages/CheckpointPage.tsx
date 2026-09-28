import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { findCheckpoint, type AnswerResult } from "@spraket/core";
import { useApp } from "../store";
import { ExercisePlayer } from "../components/ExercisePlayer";

export function CheckpointPage() {
  const { unitId = "" } = useParams();
  const { pack, finishCheckpoint } = useApp();
  const navigate = useNavigate();
  const found = findCheckpoint(pack, unitId);
  const exercises = found?.checkpoint.exercises ?? [];
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);

  if (!found) {
    return (
      <div className="app-shell">
        <main className="app-main">
          <p>Checkpoint not found.</p>
          <Link to="/path">Back to path</Link>
        </main>
      </div>
    );
  }

  const exercise = exercises[index];

  function onGraded(result: AnswerResult) {
    setResults((r) => [...r, result]);
    setAwaitingNext(true);
  }

  function continueAfterFeedback() {
    if (index + 1 >= exercises.length) {
      const claim = finishCheckpoint({
        unitId,
        checkpointId: found!.checkpoint.id,
        results,
      });
      setPassed(claim.passed);
      setSummary(
        claim.passed
          ? `${claim.claimSummary} · ${Math.round(claim.accuracy * 100)}%`
          : `Need 80% to claim. You scored ${Math.round(claim.accuracy * 100)}%.`,
      );
      setAwaitingNext(false);
      return;
    }
    setAwaitingNext(false);
    setIndex((i) => i + 1);
  }

  if (summary) {
    return (
      <div className="app-shell">
        <main className="app-main page-enter stack stack-lg">
          <h1 className="headline">
            {passed ? "Checkpoint passed" : "Not yet"}
          </h1>
          <p className="lede">{summary}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/progress")}
          >
            View progress
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/path")}
          >
            Back to path
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-main page-enter stack">
        <div className="chip">Checkpoint · claim {found.unit.claimTarget ?? found.unit.cefr}</div>
        <h1 className="headline">{found.checkpoint.title}</h1>
        <div className="progress-rail">
          <span
            style={{
              width: `${exercises.length ? (results.length / exercises.length) * 100 : 0}%`,
            }}
          />
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
            {index + 1 >= exercises.length ? "See claim result" : "Continue"}
          </button>
        )}
      </main>
    </div>
  );
}
