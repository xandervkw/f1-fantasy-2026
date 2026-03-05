import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCompetition?: boolean;
}

export default function ProtectedRoute({
  children,
  requireCompetition = true,
}: ProtectedRouteProps) {
  const { session, competitionId, loading } = useAuth();
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

  return <>{children}</>;
}
