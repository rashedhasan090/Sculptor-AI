import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NewModelPage } from "./pages/NewModelPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { ResultsPage } from "./pages/ResultsPage";
import { SolutionDetailPage } from "./pages/SolutionDetailPage";
import { SimulationLabPage } from "./pages/SimulationLabPage";
import { BenchmarksPage } from "./pages/BenchmarksPage";
import { DocumentationPage } from "./pages/DocumentationPage";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <Toaster />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<DocumentationPage />} />
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/models/new" element={<NewModelPage />} />
              <Route path="/analysis/:modelId" element={<AnalysisPage />} />
              <Route path="/results/:runId" element={<ResultsPage />} />
              <Route path="/solution/:solutionId" element={<SolutionDetailPage />} />
              <Route path="/simulation" element={<SimulationLabPage />} />
              <Route path="/benchmarks" element={<BenchmarksPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
