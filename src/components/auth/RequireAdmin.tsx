import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/components/auth/AdminAuthProvider";

export const RequireAdmin = () => {
  const location = useLocation();
  const { loading, isAdmin } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
        Validando acceso admin...
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};
