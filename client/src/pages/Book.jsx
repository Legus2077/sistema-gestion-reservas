import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toast.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import { formatDate, formatMoney } from '../utils.js';

export default function Book() {
  const { roomId } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const checkIn = params.get('checkIn');
  const checkOut = params.get('checkOut');
  const guests = Number(params.get('guests') || 1);

  const [availability, setAvailability] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
  });

  useEffect(() => {
    if (user) {
      setForm((current) => ({
        ...current,
        guestName: current.guestName || user.name,
        guestEmail: current.guestEmail || user.email,
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!checkIn || !checkOut) {
      setError('Faltan las fechas de la reserva. Volvé a buscar disponibilidad.');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api(`/availability?${qs({ checkIn, checkOut, guests })}`)
      .then((data) => {
        if (cancelled) return;
        const found = data.rooms.find((item) => item.id === Number(roomId));
        setAvailability(data);
        setRoom(found || null);
        if (!found) {
          setError('Esa habitación ya no está disponible para las fechas elegidas.');
        }
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
  }, [roomId, checkIn, checkOut, guests]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const data = await api('/reservations', {
        method: 'POST',
        body: {
          roomId: Number(roomId),
          checkIn,
          checkOut,
          guests,
          guestName: form.guestName,
          guestEmail: form.guestEmail,
          guestPhone: form.guestPhone,
        },
      });
      toast('Reserva confirmada. Te enviamos el detalle por email.');
      navigate(`/reservas/${data.reservation.id}`, {
        replace: true,
        state: { created: true },
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader label="Verificando disponibilidad…" />;

  if (error && !room) {
    return (
      <div className="container page narrow">
        <div className="alert error">{error}</div>
        <Link to="/" className="btn btn-outline">
          Volver a buscar
        </Link>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="book-layout">
        <section className="card form-card">
          <p className="eyebrow">Paso final</p>
          <h1>Confirmá tu reserva</h1>
          <p className="muted">
            Revisá los datos del huésped. El precio se calcula y valida en el servidor.
          </p>

          {error && <div className="alert error">{error}</div>}

          <form className="form" onSubmit={handleSubmit}>
            <div className="form-row">
              <label className="field">
                <span>Nombre del huésped</span>
                <input
                  type="text"
                  minLength={2}
                  value={form.guestName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, guestName: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.guestEmail}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, guestEmail: event.target.value }))
                  }
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>Teléfono (opcional)</span>
              <input
                type="tel"
                maxLength={40}
                value={form.guestPhone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, guestPhone: event.target.value }))
                }
              />
            </label>

            <div className="notice">
              La reserva queda confirmada al instante. Podés consultar la política de cancelación
              del hotel antes de confirmar.
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Confirmando…' : 'Confirmar reserva'}
            </button>
          </form>
        </section>

        <aside className="summary-card">
          <p className="eyebrow">Resumen</p>
          <h2>
            Habitación {room.number} · {room.type}
          </h2>

          <dl className="summary-list">
            <div>
              <dt>Entrada</dt>
              <dd>{formatDate(checkIn, { long: true })}</dd>
            </div>
            <div>
              <dt>Salida</dt>
              <dd>{formatDate(checkOut, { long: true })}</dd>
            </div>
            <div>
              <dt>Noches</dt>
              <dd>{availability.nights}</dd>
            </div>
            <div>
              <dt>Huéspedes</dt>
              <dd>{availability.guests}</dd>
            </div>
            <div>
              <dt>Precio por noche</dt>
              <dd>{formatMoney(room.pricePerNight, availability.currency)}</dd>
            </div>
          </dl>

          <div className="summary-total">
            <span>Total</span>
            <strong>{formatMoney(room.totalPrice, availability.currency)}</strong>
          </div>

          <p className="tiny muted">
            El total incluye {availability.nights}{' '}
            {availability.nights === 1 ? 'noche' : 'noches'} de alojamiento. No incluye extras.
          </p>

          <Link to="/" className="btn btn-ghost btn-block">
            Cambiar fechas
          </Link>
        </aside>
      </div>
    </div>
  );
}
