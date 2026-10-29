import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../components/Toast.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate, formatMoney } from '../utils.js';

export default function MyReservations() {
  const toast = useToast();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api('/reservations/mine')
      .then((data) => {
        if (!cancelled) setReservations(data.reservations);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCancel(reservation) {
    if (!window.confirm(`¿Cancelar la reserva ${reservation.code}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setBusyId(reservation.id);
    setError(null);
    try {
      const data = await api(`/reservations/${reservation.id}/cancel`, { method: 'POST' });
      setReservations((current) =>
        current.map((item) => (item.id === reservation.id ? data.reservation : item)),
      );
      toast('Reserva cancelada. Te enviamos el email de confirmación.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <PageLoader label="Cargando tus reservas…" />;

  return (
    <div className="container page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Tu cuenta</p>
          <h1>Mis reservas</h1>
        </div>
        <Link to="/" className="btn btn-primary">
          Nueva reserva
        </Link>
      </div>

      {error && <div className="alert error">{error}</div>}

      {reservations.length === 0 ? (
        <div className="empty-state">
          <h3>Todavía no tenés reservas</h3>
          <p>Buscá disponibilidad y elegí la habitación que más te guste.</p>
          <Link to="/" className="btn btn-primary">
            Ver habitaciones
          </Link>
        </div>
      ) : (
        <div className="reservation-list">
          {reservations.map((reservation) => (
            <article key={reservation.id} className="reservation-card">
              <div className="reservation-main">
                <div className="reservation-head">
                  <span className="code">{reservation.code}</span>
                  <StatusBadge status={reservation.status} />
                </div>
                <h3>
                  Habitación {reservation.room.number} · {reservation.room.type}
                </h3>
                <p className="muted">
                  {formatDate(reservation.checkIn)} → {formatDate(reservation.checkOut)} ·{' '}
                  {reservation.nights} {reservation.nights === 1 ? 'noche' : 'noches'} ·{' '}
                  {reservation.guests} {reservation.guests === 1 ? 'huésped' : 'huéspedes'}
                </p>
              </div>

              <div className="reservation-side">
                <strong>{formatMoney(reservation.totalPrice, reservation.currency)}</strong>
                <div className="reservation-actions">
                  <Link to={`/reservas/${reservation.id}`} className="btn btn-outline btn-sm">
                    Ver detalle
                  </Link>
                  {reservation.canCancel && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancel(reservation)}
                      disabled={busyId === reservation.id}
                    >
                      {busyId === reservation.id ? 'Cancelando…' : 'Cancelar'}
                    </button>
                  )}
                </div>
                {!reservation.canCancel && reservation.cancelBlockedReason && (
                  <p className="tiny muted reservation-note">{reservation.cancelBlockedReason}</p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
