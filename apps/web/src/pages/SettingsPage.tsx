import { useApp } from "../store";
import { TabBar } from "../components/TabBar";

export function SettingsPage() {
  const { state, resetAll } = useApp();

  return (
    <div className="app-shell">
      <main className="app-main page-enter stack stack-lg">
        <div>
          <p className="brand" style={{ fontSize: "1.5rem", margin: 0 }}>
            Settings
          </p>
          <p className="muted">On-device only for this scaffold.</p>
        </div>

        <section className="panel stack">
          <div>
            <strong>Goal</strong>
            <div className="muted">{state.goal}</div>
          </div>
          <div>
            <strong>Prior exposure</strong>
            <div className="muted">{state.priorExposure}</div>
          </div>
          <div>
            <strong>How we score</strong>
            <div className="muted">
              Lesson pass ≥80%. Skill bands use EMA (α≈0.3) blended with
              checkpoints (weight ≥0.5). Provisional ≠ claimed. Skrive/snakke
              stay estimated until a stronger rubric exists.
            </div>
          </div>
        </section>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            if (
              window.confirm(
                "Reset all local progress and return to onboarding?",
              )
            ) {
              resetAll();
              window.location.href = "/";
            }
          }}
        >
          Reset local progress
        </button>
      </main>
      <TabBar />
    </div>
  );
}
