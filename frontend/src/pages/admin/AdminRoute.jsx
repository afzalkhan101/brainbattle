import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isAdmin } from './shared';
export default function AdminRoute({
  children
}) {
  const {
    user
  } = useAuth();
  return isAdmin(user) ? children : <Navigate to="/dashboard" replace />;
}
