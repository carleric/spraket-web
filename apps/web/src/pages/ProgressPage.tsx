import {
  confidenceLabel,
  norskprovenLabel,
  skillDisplayName,
} from "@spraket/core";
import { useApp } from "../store";
import { TabBar } from "../components/TabBar";

export function ProgressPage() {
  const { state } = useApp();

  return (
    <div className="app-shell">
      <main className="app-main page-enter stack stack-lg">
        <div>
          <p className="brand" style={{ fontSize: "1.5rem", margin: 0 }}>
            Progress
          </p>
          <p className="muted">CEFR + Norskprøven bands — not XP.</p>
        </div>

        <section className="panel stack">
          <h1 className="headline" style={{ fontSize: "1.25rem" }}>
            Overall
          </h1>
          <p>
            Provisional <strong>{state.provisionalCEFR}</strong>
            {state.claimedCEFR ? (
              <>
                {" "}
                · Claimed <strong>{state.claimedCEFR}</strong>
              </>
            ) : (
              " · no claimed level yet"
            )}
          </p>
          <p className="muted">
            Goal: {state.goal}. Claimed levels require unit checkpoints +
            evidence.
          </p>
        </section>

        <section className="stack">
          <h2 className="headline" style={{ fontSize: "1.15rem" }}>
            Norskprøven skills
          </h2>
          {state.skills.map((s) => (
            <div key={s.skill} className="panel">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.5rem",
                }}
              >
                <strong>{skillDisplayName(s.skill)}</strong>
                <span className="chip">
                  {s.provisionalBand}
                  {s.estimatedOnly ? " est." : ""}
                </span>
              </div>
              <div className="skill-bar">
                <span style={{ width: `${Math.min(100, s.emaScore * 100)}%` }} />
              </div>
              <p className="muted" style={{ marginBottom: 0 }}>
                EMA {Math.round(s.emaScore * 100)}% · {s.sampleCount} samples ·{" "}
                {confidenceLabel(s.sampleCount)}
                {s.claimedBand
                  ? ` · claimed ${norskprovenLabel(s.claimedBand)}`
                  : " · unclaimed"}
              </p>
            </div>
          ))}
        </section>

        {state.checkpoints.filter((c) => c.passed).length > 0 && (
          <section className="stack">
            <h2 className="headline" style={{ fontSize: "1.15rem" }}>
              Checkpoint history
            </h2>
            {state.checkpoints
              .filter((c) => c.passed)
              .map((c) => (
                <div key={c.checkpointId} className="panel muted">
                  {c.claimSummary ?? c.checkpointId} · best{" "}
                  {Math.round(c.bestAccuracy * 100)}%
                </div>
              ))}
          </section>
        )}
      </main>
      <TabBar />
    </div>
  );
}
