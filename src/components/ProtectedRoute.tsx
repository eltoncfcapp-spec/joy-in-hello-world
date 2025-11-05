// components/ProtectedRoute.tsx
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
}

const ProtectedRoute = ({ children, requiredRole, requiredPermission }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (!loading && user) {
      // Check role requirement
      if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        navigate('/unauthorized');
        return;
      }

      // Check permission requirement
      if (requiredPermission && !user.permissions.includes(requiredPermission) && user.role !== 'admin') {
        navigate('/unauthorized');
        return;
      }
    }
  }, [user, loading, navigate, requiredRole, requiredPermission]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
