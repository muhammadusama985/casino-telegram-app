import { Navigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return <div className="p-6">Checking session…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}
