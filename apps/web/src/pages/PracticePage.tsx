import { useState } from "react";
import { Link } from "react-router-dom";
import {
  skillDisplayName,
  type AnswerResult,
  type NorskprovenSkill,
  type TaggedExercise,
} from "@spraket/core";
import { useApp } from "../store";
import { TabBar } from "../components/TabBar";
import { ExercisePlayer } from "../components/ExercisePlayer";

export function PracticePage() {
  const { weakestSkills, buildPractice, finishPractice, dueCount } = useApp();
  const [session, setSession] = useState<{
    skill: NorskprovenSkill;
    items: TaggedExercise[];
  } | null>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<AnswerResult[]>([]);
  const [awaitingNext, setAwaitingNext] = useState(false);
  const [doneAccuracy, setDoneAccuracy] = useState<number | null>(null);

  function start(skill: NorskprovenSkill) {
    const items = buildPractice(skill);
    setSession({ skill, items });
    setIndex(0);
    setResults([]);
    setAwaitingNext(false);
    setDoneAccuracy(null);
  }

  if (doneAccuracy !== null && session) {
    return (
      <div className="app-shell">
        <main className="app-main page-enter stack stack-lg">
          <h1 className="headline">Practice complete</h1>
          <p className="lede">
            {skillDisplayName(session.skill)} ·{" "}
            {Math.round(doneAccuracy * 100)}% (formative — no claims)
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSession(null);
              setDoneAccuracy(null);
            }}
          >
            Back to practice
          </button>
        </main>
        <TabBar />
      </div>
    );
  }

  if (session) {
    const item = session.items[index];
    return (
      <div className="app-shell">
        <main className="app-main page-enter stack">
          <p className="chip">{skillDisplayName(session.skill)}</p>
          <h1 className="headline">Weak-area drill</h1>
          {item ? (
            <>
              <p style={{ fontWeight: 600 }}>{item.exercise.prompt}</p>
              <ExercisePlayer
                key={item.id}
                exercise={item.exercise}
                onGraded={(r) => {
                  setResults((prev) => [...prev, r]);
                  setAwaitingNext(true);
                }}
              />
            </>
          ) : (
            <p className="muted">No exercises tagged for this skill yet.</p>
          )}
          {awaitingNext && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (index + 1 >= session.items.length) {
                  const accuracy =
                    results.length === 0
                      ? 0
                      : results.reduce((a, r) => {
                          if (r === "correct") return a + 1;
                          if (r === "partial") return a + 0.5;
                          return a;
                        }, 0) / results.length;
                  finishPractice(session.skill, accuracy);
                  setDoneAccuracy(accuracy);
                  setAwaitingNext(false);
                } else {
                  setAwaitingNext(false);
                  setIndex((i) => i + 1);
                }
              }}
            >
              {index + 1 >= session.items.length ? "Finish" : "Continue"}
            </button>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-main page-enter stack stack-lg">
        <div>
          <p className="brand" style={{ fontSize: "1.5rem", margin: 0 }}>
            Practice
          </p>
          <p className="muted">
            Weak-area drills update EMA only — they never claim bands.
          </p>
        </div>

        {dueCount > 0 && (
          <Link to="/review" className="btn btn-amber" style={{ textAlign: "center" }}>
            Review due ({dueCount})
          </Link>
        )}

        {weakestSkills.length === 0 ? (
          <p className="panel muted">
            Complete a lesson first so we can rank skill weakness.
          </p>
        ) : (
          <div className="stack">
            {weakestSkills.map((s) => (
              <button
                key={s.skill}
                type="button"
                className="choice"
                onClick={() => start(s.skill)}
              >
                <strong>{skillDisplayName(s.skill)}</strong>
                <div className="muted">
                  EMA {Math.round(s.emaScore * 100)}% · {s.sampleCount} samples
                </div>
                <div className="skill-bar">
                  <span style={{ width: `${s.emaScore * 100}%` }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
      <TabBar />
    </div>
  );
}
