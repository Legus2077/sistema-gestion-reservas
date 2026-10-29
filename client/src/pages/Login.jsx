import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const from = location.state?.from
    ? `${location.state.from.pathname}${location.state.from.search || ''}`
    : '/';

  function fillDemo(role) {
    if (role === 'client') {
      setEmail('cliente@hotelaurora.test');
      setPassword('Cliente123!');
    } else if (role === 'reception') {
      setEmail('recepcion@hotelaurora.test');
      setPassword('Recepcion123!');
    } else {
      setEmail('admin@hotelaurora.test');
      setPassword('Admin123!');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page auth-page">
      <div className="auth-card">
        <p className="eyebrow">Bienvenido de nuevo</p>
        <h1>Ingresá a tu cuenta</h1>
        <p className="muted">Gestioná tus reservas y cancelaciones.</p>

        {error && <div className="alert error">{error}</div>}

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="auth-switch">
          ¿No tenés cuenta? <Link to="/register">Creá una gratis</Link>
        </p>

        <div className="demo-box">
          <p>Cuentas de prueba</p>
          <div className="demo-buttons">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemo('client')}>
              Cliente
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fillDemo('reception')}
            >
              Recepción
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fillDemo('admin')}>
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
