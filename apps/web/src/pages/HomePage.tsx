import { Link } from "react-router-dom";
import { findLesson } from "@spraket/core";
import { useApp } from "../store";
import { TabBar } from "../components/TabBar";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

export function HomePage() {
  const { state, nextItem, dueCount, pack } = useApp();
  const { canInstall, promptInstall } = useInstallPrompt();

  let continueLabel = "Browse the path";
  let continueTo = "/path";
  if (nextItem?.kind === "lesson") {
    const found = findLesson(pack, nextItem.lessonId);
    continueLabel = found
      ? `Continue: ${found.lesson.title}`
      : "Continue lesson";
    continueTo = `/lesson/${nextItem.unitId}/${nextItem.lessonId}`;
  } else if (nextItem?.kind === "checkpoint") {
    continueLabel = "Unit checkpoint";
    continueTo = `/checkpoint/${nextItem.unitId}`;
  } else if (!nextItem) {
    continueLabel = "Path complete — practice or review";
    continueTo = "/practice";
  }

  return (
    <div className="app-shell">
      <main className="app-main page-enter stack stack-lg">
        <div>
          <p className="brand" style={{ fontSize: "1.75rem", margin: 0 }}>
            Språket
          </p>
          <p className="muted" style={{ marginTop: "0.25rem" }}>
            Calm Bokmål · CEFR + Norskprøven
          </p>
        </div>

        <section className="panel stack">
          <h1 className="headline" style={{ fontSize: "1.35rem" }}>
            Continue
          </h1>
          <p className="lede">
            Provisional{" "}
            <strong>{state.provisionalCEFR}</strong>
            {state.claimedCEFR
              ? ` · Claimed ${state.claimedCEFR}`
              : " · nothing claimed yet"}
          </p>
          <Link to={continueTo} className="btn btn-primary" style={{ textAlign: "center" }}>
            {continueLabel}
          </Link>
          {dueCount > 0 && (
            <Link to="/review" className="btn btn-amber" style={{ textAlign: "center" }}>
              Review due ({dueCount})
            </Link>
          )}
        </section>

        {canInstall && (
          <div className="install-banner stack">
            <span>Install Språket for offline lessons on this device.</span>
            <button type="button" className="btn btn-primary" onClick={promptInstall}>
              Install app
            </button>
          </div>
        )}
      </main>
      <TabBar />
    </div>
  );
}
