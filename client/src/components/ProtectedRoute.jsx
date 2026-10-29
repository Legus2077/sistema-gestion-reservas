import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { PageLoader } from './Spinner.jsx';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container page">
        <div className="alert error">
          <strong>Acceso restringido.</strong> Tu rol no tiene permiso para ver esta sección.
        </div>
      </div>
    );
  }

  return children;
}
