export function Spinner({ label = 'Cargando…' }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Cargando…' }) {
  return (
    <div className="page-loader">
      <Spinner label={label} />
    </div>
  );
}
