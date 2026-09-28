import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  LEARNING_GOALS,
  PLACEMENT_ITEMS,
  PRIOR_EXPOSURES,
  gradePlacementChoice,
  type LearningGoal,
  type PriorExposure,
} from "@spraket/core";
import { useApp } from "../store";

export function OnboardingPage() {
  const { state, completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<LearningGoal>("general");
  const [prior, setPrior] = useState<PriorExposure>("none");
  const [placementIndex, setPlacementIndex] = useState(0);
  const [correct, setCorrect] = useState(0);

  if (state.hasCompletedOnboarding) {
    return <Navigate to="/" replace />;
  }

  function finish(skipped: boolean, finalCorrect = correct) {
    completeOnboarding({
      goal,
      prior,
      placementCorrect: finalCorrect,
      placementTotal: PLACEMENT_ITEMS.length,
      skipped,
    });
  }

  return (
    <div className="app-shell">
      <main className="app-main page-enter stack stack-lg">
        <p className="brand brand-hero">Språket</p>

        {step === 0 && (
          <>
            <h1 className="headline">Learn Bokmål without the guilt loops.</h1>
            <p className="lede">
              Short lessons, honest CEFR + Norskprøven progress. No streaks,
              leagues, or hearts.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(1)}
            >
              Get started
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="headline">What&apos;s your main goal?</h1>
            <div className="stack">
              {LEARNING_GOALS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`choice ${goal === g.id ? "selected" : ""}`}
                  onClick={() => setGoal(g.id)}
                >
                  <strong>{g.title}</strong>
                  <div className="muted">{g.subtitle}</div>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="headline">Any Norwegian before?</h1>
            <div className="stack">
              {PRIOR_EXPOSURES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`choice ${prior === p.id ? "selected" : ""}`}
                  onClick={() => setPrior(p.id)}
                >
                  {p.title}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(3)}
            >
              Take a short placement
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => finish(true)}
            >
              Skip for now
            </button>
          </>
        )}

        {step === 3 && (
          <PlacementStep
            index={placementIndex}
            onAnswer={(ok) => {
              const nextCorrect = correct + (ok ? 1 : 0);
              setCorrect(nextCorrect);
              if (placementIndex + 1 >= PLACEMENT_ITEMS.length) {
                setStep(4);
                setCorrect(nextCorrect);
              } else {
                setPlacementIndex((i) => i + 1);
              }
            }}
          />
        )}

        {step === 4 && (
          <>
            <h1 className="headline">Placement complete</h1>
            <p className="lede">
              You got {correct} of {PLACEMENT_ITEMS.length}. We&apos;ll start
              you with a provisional level — claimed bands come after unit
              checkpoints.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => finish(false, correct)}
            >
              Enter the path
            </button>
          </>
        )}
      </main>
    </div>
  );
}

function PlacementStep({
  index,
  onAnswer,
}: {
  index: number;
  onAnswer: (correct: boolean) => void;
}) {
  const item = PLACEMENT_ITEMS[index]!;
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <>
      <p className="chip">
        Placement {index + 1}/{PLACEMENT_ITEMS.length}
      </p>
      <h1 className="headline">{item.prompt}</h1>
      <div className="stack">
        {item.choices.map((c) => (
          <button
            key={c}
            type="button"
            className={`choice ${picked === c ? "selected" : ""}`}
            onClick={() => {
              if (picked) return;
              setPicked(c);
              window.setTimeout(() => {
                onAnswer(gradePlacementChoice(item, c));
                setPicked(null);
              }, 280);
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </>
  );
}
