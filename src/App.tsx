import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingPage from "@/pages/index";
import JoinPage from "@/pages/join";
import DashboardPage from "@/pages/dashboard";
import StandingsPage from "@/pages/standings";
import HistoryPage from "@/pages/history";
import RacePage from "@/pages/race";
import DraftPage from "@/pages/draft";
import AdminPage from "@/pages/admin";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />

          {/* Login required, no competition required */}
          <Route
            path="/join"
            element={
              <ProtectedRoute requireCompetition={false}>
                <JoinPage />
              </ProtectedRoute>
            }
          />

          {/* Login + competition required */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/standings"
            element={
              <ProtectedRoute>
                <StandingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/race"
            element={
              <ProtectedRoute>
                <RacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/draft"
            element={
              <ProtectedRoute>
                <DraftPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
