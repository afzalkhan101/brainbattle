import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function PrivateRoute({
  children
}) {
  const location = useLocation();
  const {
    user,
    loading
  } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>;
  }
  if (user?.role === 'student' && !user.is_superuser && !user.class_level && location.pathname !== '/profile') return <Navigate to="/profile" replace />;
  return user ? children : <Navigate to="/login" replace />;
}
