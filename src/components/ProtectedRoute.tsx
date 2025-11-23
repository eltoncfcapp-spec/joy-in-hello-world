import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
}

const ProtectedRoute = ({ children, requiredRole, requiredPermission }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (!loading && user && profile) {
      // Check role requirement
      if (requiredRole && profile.admin_role !== requiredRole && !profile.pastor_role) {
        navigate('/unauthorized');
        return;
      }

      // Check permission requirement (admins and pastors have all permissions)
      if (requiredPermission && !profile.pastor_role && profile.admin_role !== 'admin') {
        navigate('/unauthorized');
        return;
      }
    }
  }, [user, profile, loading, navigate, requiredRole, requiredPermission]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
