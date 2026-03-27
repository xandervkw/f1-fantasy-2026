import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import LandingPage from "@/pages/index";
import JoinPage from "@/pages/join";
import DashboardPage from "@/pages/dashboard";
import StandingsPage from "@/pages/standings";
import HistoryPage from "@/pages/history";
import AdminPage from "@/pages/admin";
import AboutPage from "@/pages/about";
import FeedbackPage from "@/pages/feedback";

/** Layout wrapper that shows the nav bar on authenticated pages */
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}

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

          {/* Login + competition required — with nav bar */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/standings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <StandingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <HistoryPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AppLayout>
                  <AdminPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AboutPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <FeedbackPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all — redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
