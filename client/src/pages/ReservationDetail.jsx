import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toast.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate, formatInstant, formatMoney } from '../utils.js';

export default function ReservationDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  const [reservation, setReservation] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const justCreated = Boolean(location.state?.created);

  useEffect(() => {
    let cancelled = false;

    Promise.all([api(`/reservations/${id}`), api('/settings/public')])
      .then(([reservationData, settingsData]) => {
        if (cancelled) return;
        setReservation(reservationData.reservation);
        setSettings(settingsData);
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
  }, [id]);

  async function handleCancel() {
    if (!window.confirm('¿Confirmás la cancelación de la reserva?')) return;

    setBusy(true);
    setError(null);
    try {
      const data = await api(`/reservations/${id}/cancel`, { method: 'POST' });
      setReservation(data.reservation);
      toast('La reserva fue cancelada.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoader label="Cargando reserva…" />;

  if (error && !reservation) {
    return (
      <div className="container page narrow">
        <div className="alert error">{error}</div>
        <Link to={user?.role === 'CLIENT' ? '/mis-reservas' : '/recepcion'} className="btn btn-outline">
          Volver
        </Link>
      </div>
    );
  }

  const backTo =
    user?.role === 'CLIENT'
      ? '/mis-reservas'
      : user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST'
        ? '/recepcion'
        : '/';

  return (
    <div className="container page narrow">
      {justCreated && (
        <div className="alert success">
          <strong>¡Reserva confirmada!</strong> Te enviamos el detalle a {reservation.guestEmail}.
        </div>
      )}

      {error && <div className="alert error">{error}</div>}

      <article className="detail-card">
        <div className="detail-head">
          <div>
            <p className="eyebrow">Reserva</p>
            <h1>{reservation.code}</h1>
          </div>
          <StatusBadge status={reservation.status} />
        </div>

        <div className="detail-hero">
          <div>
            <span className="tiny muted">Habitación</span>
            <strong>
              {reservation.room.number} · {reservation.room.type}
            </strong>
          </div>
          <div>
            <span className="tiny muted">Total</span>
            <strong>{formatMoney(reservation.totalPrice, reservation.currency)}</strong>
          </div>
        </div>

        <dl className="detail-grid">
          <div>
            <dt>Entrada</dt>
            <dd>
              {formatDate(reservation.checkIn, { long: true })}
              {settings && <small> desde las {settings.checkInTime}</small>}
            </dd>
          </div>
          <div>
            <dt>Salida</dt>
            <dd>
              {formatDate(reservation.checkOut, { long: true })}
              {settings && <small> hasta las {settings.checkOutTime}</small>}
            </dd>
          </div>
          <div>
            <dt>Noches</dt>
            <dd>{reservation.nights}</dd>
          </div>
          <div>
            <dt>Huéspedes</dt>
            <dd>{reservation.guests}</dd>
          </div>
          <div>
            <dt>Huésped</dt>
            <dd>{reservation.guestName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{reservation.guestEmail}</dd>
          </div>
          {reservation.guestPhone && (
            <div>
              <dt>Teléfono</dt>
              <dd>{reservation.guestPhone}</dd>
            </div>
          )}
          <div>
            <dt>Creada</dt>
            <dd>{formatInstant(reservation.createdAt)}</dd>
          </div>
          {reservation.checkInAt && (
            <div>
              <dt>Check-in registrado</dt>
              <dd>{formatInstant(reservation.checkInAt)}</dd>
            </div>
          )}
          {reservation.checkOutAt && (
            <div>
              <dt>Check-out registrado</dt>
              <dd>{formatInstant(reservation.checkOutAt)}</dd>
            </div>
          )}
        </dl>

        {settings && (
          <div className="policy-inline">
            <strong>Política de cancelación</strong>
            <p>{settings.policyText}</p>
          </div>
        )}

        {reservation.cancellationReason && (
          <p className="tiny muted">Nota de cancelación: {reservation.cancellationReason}</p>
        )}

        <div className="detail-actions">
          <Link to={backTo} className="btn btn-ghost">
            Volver
          </Link>
          {reservation.canCancel && (
            <button type="button" className="btn btn-danger" onClick={handleCancel} disabled={busy}>
              {busy ? 'Cancelando…' : 'Cancelar reserva'}
            </button>
          )}
        </div>

        {!reservation.canCancel && reservation.cancelBlockedReason && (
          <p className="tiny muted">{reservation.cancelBlockedReason}</p>
        )}
      </article>
    </div>
  );
}
