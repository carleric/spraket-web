import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "./store";
import { OnboardingPage } from "./pages/OnboardingPage";
import { HomePage } from "./pages/HomePage";
import { PathPage } from "./pages/PathPage";
import { LessonPage } from "./pages/LessonPage";
import { CheckpointPage } from "./pages/CheckpointPage";
import { PracticePage } from "./pages/PracticePage";
import { ReviewPage } from "./pages/ReviewPage";
import { ProgressPage } from "./pages/ProgressPage";
import { SettingsPage } from "./pages/SettingsPage";

function RequireOnboarding({ children }: { children: ReactNode }) {
  const { state } = useApp();
  if (!state.hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path="/"
        element={
          <RequireOnboarding>
            <HomePage />
          </RequireOnboarding>
        }
      />
      <Route
        path="/path"
        element={
          <RequireOnboarding>
            <PathPage />
          </RequireOnboarding>
        }
      />
      <Route
        path="/lesson/:unitId/:lessonId"
        element={
          <RequireOnboarding>
            <LessonPage />
          </RequireOnboarding>
        }
      />
      <Route
        path="/checkpoint/:unitId"
        element={
          <RequireOnboarding>
            <CheckpointPage />
          </RequireOnboarding>
        }
      />
      <Route
        path="/practice"
        element={
          <RequireOnboarding>
            <PracticePage />
          </RequireOnboarding>
        }
      />
      <Route
        path="/review"
        element={
          <RequireOnboarding>
            <ReviewPage />
          </RequireOnboarding>
        }
      />
      <Route
        path="/progress"
        element={
          <RequireOnboarding>
            <ProgressPage />
          </RequireOnboarding>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireOnboarding>
            <SettingsPage />
          </RequireOnboarding>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
