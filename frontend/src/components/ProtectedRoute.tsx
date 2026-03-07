import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext.tsx";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AdminProtectedRoute({
  children,
  minRole = 2,
}: {
  children: React.ReactNode;
  minRole?: number;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || user.role < minRole) return <Navigate to="/" replace />;
  return <>{children}</>;
}
