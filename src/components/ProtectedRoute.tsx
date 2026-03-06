import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCompetition?: boolean;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({
  children,
  requireCompetition = true,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { session, profile, competitionId, loading } = useAuth();
  const location = useLocation();

  // Still loading auth state — show spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in — redirect to landing with return URL
  if (!session) {
    const currentPath = location.pathname + location.search;
    const redirectParam =
      currentPath !== "/"
        ? `?redirect=${encodeURIComponent(currentPath)}`
        : "";
    return <Navigate to={`/${redirectParam}`} replace />;
  }

  // Logged in but no competition — redirect to join
  if (requireCompetition && !competitionId) {
    return <Navigate to="/join" replace />;
  }

  // Admin-only route — redirect non-admins to dashboard
  if (requireAdmin && !profile?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
