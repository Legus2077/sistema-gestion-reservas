import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import { addDaysISO, formatMoney, todayISO } from '../utils.js';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(() => ({
    checkIn: addDaysISO(todayISO(), 1),
    checkOut: addDaysISO(todayISO(), 3),
    guests: '2',
  }));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/settings/public')
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  function handleCheckIn(value) {
    setForm((current) => ({
      ...current,
      checkIn: value,
      checkOut: current.checkOut <= value ? addDaysISO(value, 1) : current.checkOut,
    }));
  }

  async function handleSearch(event) {
    event.preventDefault();
    setError(null);

    if (form.checkOut <= form.checkIn) {
      setError('La fecha de salida debe ser posterior a la de entrada.');
      return;
    }

    setLoading(true);
    try {
      const data = await api(`/availability?${qs(form)}`);
      setResult(data);
    } catch (requestError) {
      setError(requestError.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleBook(room) {
    const path = `/reservar/${room.id}?${qs({
      checkIn: result.checkIn,
      checkOut: result.checkOut,
      guests: result.guests,
    })}`;

    if (!user) {
      navigate('/login', { state: { from: { pathname: path, search: '' } } });
      return;
    }

    if (user.role !== 'CLIENT') return;
    navigate(path);
  }

  const hotelName = settings?.hotelName || 'Hotel Aurora';

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="eyebrow">Boutique · {settings ? '3 habitaciones' : 'Reservas directas'}</p>
          <h1>
            Tu escapada empieza
            <br />
            en {hotelName}.
          </h1>
          <p className="hero-copy">
            Elegí tus fechas, mirá disponibilidad real y reservá en menos de dos minutos.
            Sin intermediarios.
          </p>

          <form className="search-card" onSubmit={handleSearch}>
            <div className="search-fields">
              <label className="field">
                <span>Entrada</span>
                <input
                  type="date"
                  value={form.checkIn}
                  min={todayISO()}
                  onChange={(event) => handleCheckIn(event.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>Salida</span>
                <input
                  type="date"
                  value={form.checkOut}
                  min={addDaysISO(form.checkIn, 1)}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, checkOut: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Huéspedes</span>
                <select
                  value={form.guests}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, guests: event.target.value }))
                  }
                >
                  {[1, 2, 3, 4, 5, 6].map((guests) => (
                    <option key={guests} value={guests}>
                      {guests} {guests === 1 ? 'huésped' : 'huéspedes'}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className="btn btn-primary search-button" disabled={loading}>
                {loading ? 'Buscando…' : 'Ver disponibilidad'}
              </button>
            </div>
            <p className="search-hint">
              Check-in desde las {settings?.checkInTime || '15:00'} · Check-out hasta las{' '}
              {settings?.checkOutTime || '11:00'}
            </p>
          </form>
        </div>
      </section>

      <section className="container page">
        {error && <div className="alert error">{error}</div>}

        {loading && <PageLoader label="Buscando habitaciones…" />}

        {result && !loading && (
          <div className="results">
            <div className="section-head">
              <div>
                <p className="eyebrow">Disponibilidad</p>
                <h2>
                  {result.rooms.length > 0
                    ? `${result.rooms.length} ${result.rooms.length === 1 ? 'habitación disponible' : 'habitaciones disponibles'}`
                    : 'Sin habitaciones para esas fechas'}
                </h2>
              </div>
              <p className="result-summary">
                {result.nights} {result.nights === 1 ? 'noche' : 'noches'} · {result.guests}{' '}
                {result.guests === 1 ? 'huésped' : 'huéspedes'}
              </p>
            </div>

            {result.rooms.length === 0 ? (
              <div className="empty-state">
                <h3>No encontramos lugar para esas fechas</h3>
                <p>
                  Probá con otras fechas o con menos huéspedes. También podés escribirnos a{' '}
                  {settings?.hotelEmail || 'la recepción'}.
                </p>
              </div>
            ) : (
              <div className="room-grid">
                {result.rooms.map((room) => (
                  <article key={room.id} className="room-card">
                    <div className="room-card-top">
                      <span className="room-number">{room.number}</span>
                      <span className="chip">{room.type}</span>
                    </div>
                    <div className="room-card-body">
                      <h3>Habitación {room.type}</h3>
                      <p className="muted">
                        Hasta {room.capacity} {room.capacity === 1 ? 'huésped' : 'huéspedes'}
                      </p>
                      <div className="room-price">
                        <strong>{formatMoney(room.pricePerNight, result.currency)}</strong>
                        <span>por noche</span>
                      </div>
                      <div className="room-total">
                        <span>Total por {result.nights} noches</span>
                        <strong>{formatMoney(room.totalPrice, result.currency)}</strong>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-block"
                        onClick={() => handleBook(room)}
                        disabled={Boolean(user && user.role !== 'CLIENT')}
                      >
                        {user && user.role !== 'CLIENT' ? 'Solo clientes' : 'Reservar'}
                      </button>
                      {user && user.role !== 'CLIENT' && (
                        <p className="tiny muted center">
                          Las reservas desde el sitio son solo para clientes.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {settings && (
          <div className="info-grid">
            <article className="info-card">
              <span className="info-icon">01</span>
              <h3>Elegí tus fechas</h3>
              <p>La disponibilidad se calcula en tiempo real por noche.</p>
            </article>
            <article className="info-card">
              <span className="info-icon">02</span>
              <h3>Reservá online</h3>
              <p>Recibís el código de reserva y la confirmación por email.</p>
            </article>
            <article className="info-card">
              <span className="info-icon">03</span>
              <h3>Llegá y disfrutá</h3>
              <p>
                Check-in de {settings.checkInTime} a 22:00. Check-out hasta las{' '}
                {settings.checkOutTime}.
              </p>
            </article>
          </div>
        )}

        {settings && (
          <div className="policy-card">
            <div>
              <p className="eyebrow">Política de cancelación</p>
              <p>{settings.policyText}</p>
            </div>
            <a className="btn btn-outline" href={`mailto:${settings.hotelEmail}`}>
              Contactar al hotel
            </a>
          </div>
        )}
      </section>
    </>
  );
}
