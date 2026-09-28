import { useMemo, useState } from "react";
import {
  grade,
  gradeChoice,
  gradeOrdered,
  gradePairs,
  type AnswerResult,
  type ContentExercise,
} from "@spraket/core";

interface Props {
  exercise: ContentExercise;
  onGraded: (result: AnswerResult) => void;
}

export function ExercisePlayer({ exercise, onGraded }: Props) {
  switch (exercise.kind) {
    case "matchPairs":
      return <MatchPairsExercise exercise={exercise} onGraded={onGraded} />;
    case "orderWords":
      return <OrderWordsExercise exercise={exercise} onGraded={onGraded} />;
    case "listenChoose":
    case "readAnswer":
      return <ChoiceExercise exercise={exercise} onGraded={onGraded} />;
    case "translate":
    case "fillBlank":
    case "dictation":
      return <TypedExercise exercise={exercise} onGraded={onGraded} />;
    case "speakCompare":
      return (
        <div className="panel">
          <p className="muted">
            Speak &amp; compare is deferred (ASR). Skip for now.
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onGraded("incorrect")}
          >
            Skip
          </button>
        </div>
      );
    default:
      return (
        <TypedExercise exercise={exercise} onGraded={onGraded} />
      );
  }
}

function ChoiceExercise({ exercise, onGraded }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);

  function speak() {
    if (!exercise.audioText || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(exercise.audioText);
    u.lang = "nb-NO";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function submit(choice: string) {
    if (result) return;
    setSelected(choice);
    const r = gradeChoice(choice, exercise.accept);
    setResult(r);
    onGraded(r);
  }

  return (
    <div className="stack">
      {exercise.passage && (
        <p className="panel" style={{ fontStyle: "italic" }}>
          {exercise.passage}
        </p>
      )}
      {(exercise.kind === "listenChoose" || exercise.kind === "dictation") &&
        exercise.audioText && (
          <button type="button" className="btn btn-amber" onClick={speak}>
            Play audio
          </button>
        )}
      <div className="stack">
        {(exercise.choices ?? []).map((c) => (
          <button
            key={c}
            type="button"
            className={[
              "choice",
              selected === c ? "selected" : "",
              result && selected === c
                ? result === "correct"
                  ? "correct"
                  : "incorrect"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => submit(c)}
            disabled={Boolean(result)}
          >
            {c}
          </button>
        ))}
      </div>
      {result && (
        <Feedback result={result} explanation={exercise.explanation} />
      )}
    </div>
  );
}

function TypedExercise({ exercise, onGraded }: Props) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const bank = exercise.wordBank ?? [];

  function speak() {
    if (!exercise.audioText || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(exercise.audioText);
    u.lang = "nb-NO";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function submit() {
    if (result) return;
    const r = grade(value, exercise.accept);
    setResult(r);
    onGraded(r);
  }

  return (
    <div className="stack">
      {exercise.kind === "dictation" && exercise.audioText && (
        <button type="button" className="btn btn-amber" onClick={speak}>
          Play audio
        </button>
      )}
      <input
        className="field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer"
        disabled={Boolean(result)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      {bank.length > 0 && (
        <div className="token-bank">
          {bank.map((w) => (
            <button
              key={w}
              type="button"
              className="token"
              disabled={Boolean(result)}
              onClick={() =>
                setValue((v) => (v ? `${v} ${w}` : w))
              }
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {!result && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={!value.trim()}
        >
          Check
        </button>
      )}
      {result && (
        <Feedback result={result} explanation={exercise.explanation} />
      )}
    </div>
  );
}

function OrderWordsExercise({ exercise, onGraded }: Props) {
  const tokens = useMemo(
    () => shuffle([...(exercise.orderTokens ?? [])]),
    [exercise.id],
  );
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);

  function toggle(token: string, index: number) {
    if (result) return;
    const key = `${token}::${index}`;
    if (picked.includes(key)) {
      setPicked((p) => p.filter((x) => x !== key));
    } else {
      setPicked((p) => [...p, key]);
    }
  }

  function submit() {
    if (result) return;
    const words = picked.map((k) => k.split("::")[0]!);
    const r = gradeOrdered(words, exercise.accept);
    setResult(r);
    onGraded(r);
  }

  return (
    <div className="stack">
      <div className="panel" style={{ minHeight: "3rem" }}>
        {picked.length === 0 ? (
          <span className="muted">Tap words to build the sentence</span>
        ) : (
          picked.map((k) => k.split("::")[0]).join(" ")
        )}
      </div>
      <div className="token-bank">
        {tokens.map((t, i) => {
          const key = `${t}::${i}`;
          return (
            <button
              key={key}
              type="button"
              className={`token ${picked.includes(key) ? "used" : ""}`}
              onClick={() => toggle(t, i)}
              disabled={Boolean(result)}
            >
              {t}
            </button>
          );
        })}
      </div>
      {!result && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={picked.length === 0}
        >
          Check
        </button>
      )}
      {result && (
        <Feedback result={result} explanation={exercise.explanation} />
      )}
    </div>
  );
}

function MatchPairsExercise({ exercise, onGraded }: Props) {
  const pairs = exercise.pairs ?? [];
  const rights = useMemo(
    () => shuffle(pairs.map((p) => p.right)),
    [exercise.id],
  );
  const [map, setMap] = useState<Record<string, string>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);

  function pickLeft(left: string) {
    if (result) return;
    setSelectedLeft(left);
  }

  function pickRight(right: string) {
    if (result || !selectedLeft) return;
    setMap((m) => ({ ...m, [selectedLeft]: right }));
    setSelectedLeft(null);
  }

  function submit() {
    if (result) return;
    const r = gradePairs(map, pairs);
    setResult(r);
    onGraded(r);
  }

  const complete = pairs.every((p) => map[p.left]);

  return (
    <div className="stack">
      <div className="stack">
        {pairs.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`choice ${selectedLeft === p.left ? "selected" : ""}`}
            onClick={() => pickLeft(p.left)}
            disabled={Boolean(result)}
          >
            <strong>{p.left}</strong>
            <span className="muted" style={{ marginLeft: "0.75rem" }}>
              {map[p.left] ? `→ ${map[p.left]}` : "tap, then choose English"}
            </span>
          </button>
        ))}
      </div>
      <div className="token-bank">
        {rights.map((r) => (
          <button
            key={r}
            type="button"
            className="token"
            onClick={() => pickRight(r)}
            disabled={Boolean(result) || !selectedLeft}
          >
            {r}
          </button>
        ))}
      </div>
      {!result && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={!complete}
        >
          Check
        </button>
      )}
      {result && (
        <Feedback result={result} explanation={exercise.explanation} />
      )}
    </div>
  );
}

function Feedback({
  result,
  explanation,
}: {
  result: AnswerResult;
  explanation?: string;
}) {
  const label =
    result === "correct"
      ? "Correct"
      : result === "partial"
        ? "Partially correct"
        : "Not quite";
  return (
    <div className={`feedback ${result}`}>
      {label}
      {explanation ? ` — ${explanation}` : ""}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}
