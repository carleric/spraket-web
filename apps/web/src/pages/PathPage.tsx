import { Link } from "react-router-dom";
import { useApp } from "../store";
import { TabBar } from "../components/TabBar";

export function PathPage() {
  const { pack, state, lessonLock } = useApp();

  return (
    <div className="app-shell">
      <main className="app-main page-enter">
        <p className="brand" style={{ fontSize: "1.5rem", margin: "0 0 0.25rem" }}>
          Path
        </p>
        <p className="muted" style={{ marginTop: 0 }}>
          {pack.track} · A1 → B1 sample path
        </p>

        {pack.units.map((unit) => {
          const cp = state.checkpoints.find(
            (c) => c.checkpointId === unit.checkpoint?.id,
          );
          const lessonsDone = unit.lessons.every(
            (l) => lessonLock(l.id) === "completed",
          );
          return (
            <section key={unit.id} className="path-unit">
              <div className="chip">{unit.cefr}</div>
              <h2>{unit.title}</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                {unit.theme} · {unit.grammarFocus}
              </p>
              {unit.lessons.map((lesson) => {
                const lock = lessonLock(lesson.id);
                const body = (
                  <div
                    className={`lesson-row ${lock === "locked" ? "locked" : ""}`}
                  >
                    <div>
                      <strong>{lesson.title}</strong>
                      <div className="muted">{lesson.microSkill}</div>
                    </div>
                    <span className="muted">
                      {lock === "completed"
                        ? "Done"
                        : lock === "unlocked"
                          ? "Open"
                          : "Locked"}
                    </span>
                  </div>
                );
                if (lock === "locked") return <div key={lesson.id}>{body}</div>;
                return (
                  <Link
                    key={lesson.id}
                    to={`/lesson/${unit.id}/${lesson.id}`}
                  >
                    {body}
                  </Link>
                );
              })}
              {unit.checkpoint && (
                <div className="lesson-row">
                  <div>
                    <strong>{unit.checkpoint.title}</strong>
                    <div className="muted">
                      Claim target {unit.claimTarget ?? unit.cefr}
                    </div>
                  </div>
                  {lessonsDone ? (
                    <Link
                      to={`/checkpoint/${unit.id}`}
                      className="btn btn-amber"
                      style={{ padding: "0.5rem 0.9rem" }}
                    >
                      {cp?.passed ? "Retake" : "Start"}
                    </Link>
                  ) : (
                    <span className="muted">After lessons</span>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </main>
      <TabBar />
    </div>
  );
}
