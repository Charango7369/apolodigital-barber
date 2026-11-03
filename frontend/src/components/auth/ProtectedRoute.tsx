import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070d1e] flex flex-col items-center justify-center text-white">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-14 h-14 border-4 border-[#1a4fd6]/20 border-t-[#f0b429] rounded-full animate-spin"></div>
        </div>
        <p className="text-xs uppercase font-bold tracking-widest text-[#94a3b8] animate-pulse">
          Verificando credenciales de acceso...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Preserve current location in query param for post-login redirect
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} replace />;
  }

  // RBAC check if specific roles are required
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-[#070d1e] flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl mb-4 text-rose-400">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acceso No Autorizado</h2>
        <p className="text-sm text-[#94a3b8] max-w-md mb-6">
          Tu rol actual ({user.role}) no tiene permisos para acceder a este módulo operativo.
        </p>
        <Navigate to="/dashboard" replace />
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
