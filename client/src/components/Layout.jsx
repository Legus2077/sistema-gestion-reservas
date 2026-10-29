import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { ROLE_LABELS } from '../utils.js';

function navClass({ isActive }) {
  return isActive ? 'nav-link active' : 'nav-link';
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="container nav-inner">
          <Link to="/" className="brand" aria-label="Hotel Aurora, inicio">
            <span className="brand-mark">A</span>
            <span>
              <strong>Hotel Aurora</strong>
              <small>Reservas</small>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Navegación principal">
            <NavLink to="/" className={navClass} end>
              Buscar
            </NavLink>

            {user?.role === 'CLIENT' && (
              <NavLink to="/mis-reservas" className={navClass}>
                Mis reservas
              </NavLink>
            )}

            {(user?.role === 'RECEPTIONIST' || user?.role === 'ADMIN') && (
              <NavLink to="/recepcion" className={navClass}>
                Recepción
              </NavLink>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <NavLink to="/admin/habitaciones" className={navClass}>
                  Habitaciones
                </NavLink>
                <NavLink to="/admin/configuracion" className={navClass}>
                  Configuración
                </NavLink>
              </>
            )}
          </nav>

          <div className="nav-user">
            {user ? (
              <>
                <span className="nav-user-info">
                  <strong>{user.name}</strong>
                  <small>{ROLE_LABELS[user.role]}</small>
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Ingresar
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>© {new Date().getFullYear()} Hotel Aurora</span>
          <span>Reservas directas, sin intermediarios.</span>
        </div>
      </footer>
    </div>
  );
}
