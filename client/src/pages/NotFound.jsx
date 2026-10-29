import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container page">
      <div className="empty-state">
        <p className="eyebrow">404</p>
        <h1>Esta página no existe</h1>
        <p>Puede que el enlace esté roto o que la página se haya movido.</p>
        <Link to="/" className="btn btn-primary">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
