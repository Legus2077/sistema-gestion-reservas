import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Modal from '../components/Modal.jsx';
import { PageLoader } from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  addDaysISO,
  formatDate,
  formatDateShort,
  formatInstant,
  formatMoney,
  isWeekend,
  monthLabel,
  monthOf,
  shiftMonth,
  statusInfo,
  todayISO,
  weekdayNarrow,
} from '../utils.js';

function emptyBooking(calendar) {
  const firstRoom = calendar?.rooms?.find((room) => room.active);
  const today = todayISO();
  return {
    roomId: firstRoom ? String(firstRoom.id) : '',
    checkIn: today,
    checkOut: addDaysISO(today, 1),
    guests: '1',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
  };
}

export default function Reception() {
  const toast = useToast();
  const [month, setMonth] = useState(() => monthOf());
  const [calendar, setCalendar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [actionBusy, setActionBusy] = useState(null);
  const [dayReservations, setDayReservations] = useState([]);
  const [dayLoading, setDayLoading] = useState(true);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState(() => emptyBooking(null));
  const [bookingError, setBookingError] = useState(null);
  const [bookingBusy, setBookingBusy] = useState(false);

  const today = todayISO();

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/reception/calendar?month=${month}`);
      setCalendar(data);
      setError(null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  const loadDay = useCallback(async () => {
    setDayLoading(true);
    try {
      const data = await api(`/reception/reservations?date=${today}`);
      setDayReservations(data.reservations);
    } catch {
      setDayReservations([]);
    } finally {
      setDayLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  function openNewBooking() {
    setBookingForm(emptyBooking(calendar));
    setBookingError(null);
    setBookingOpen(true);
  }

  async function runAction(reservation, action) {
    setActionBusy(action);
    try {
      const data = await api(`/reception/reservations/${reservation.id}/${action}`, {
        method: 'POST',
      });
      setSelected(data.reservation);
      toast(
        action === 'check-in'
          ? 'Check-in registrado.'
          : action === 'check-out'
            ? 'Check-out registrado.'
            : 'Reserva marcada como no presentada.',
      );
      await Promise.all([loadCalendar(), loadDay()]);
    } catch (requestError) {
      toast(requestError.message, 'error');
    } finally {
      setActionBusy(null);
    }
  }

  async function cancelSelected() {
    if (!window.confirm(`¿Cancelar la reserva ${selected.code}?`)) return;

    setActionBusy('cancel');
    try {
      const data = await api(`/reservations/${selected.id}/cancel`, {
        method: 'POST',
        body: { reason: 'Cancelada desde recepción' },
      });
      setSelected(data.reservation);
      toast('Reserva cancelada.');
      await Promise.all([loadCalendar(), loadDay()]);
    } catch (requestError) {
      toast(requestError.message, 'error');
    } finally {
      setActionBusy(null);
    }
  }

  async function handleCreateBooking(event) {
    event.preventDefault();
    setBookingError(null);
    setBookingBusy(true);

    try {
      const data = await api('/reception/reservations', {
        method: 'POST',
        body: {
          ...bookingForm,
          roomId: Number(bookingForm.roomId),
          guests: Number(bookingForm.guests),
        },
      });
      setBookingOpen(false);
      toast(`Reserva ${data.reservation.code} creada.`);
      await Promise.all([loadCalendar(), loadDay()]);
    } catch (requestError) {
      setBookingError(requestError.message);
    } finally {
      setBookingBusy(false);
    }
  }

  function barStyle(reservation) {
    const start =
      reservation.checkIn < calendar.monthStart ? calendar.monthStart : reservation.checkIn;
    const end = reservation.checkOut > calendar.monthEnd ? calendar.monthEnd : reservation.checkOut;
    const startIndex = Math.max(0, calendar.days.indexOf(start));
    const endIndex =
      end === calendar.monthEnd ? calendar.days.length : Math.max(0, calendar.days.indexOf(end));

    return { gridColumn: `${startIndex + 1} / ${endIndex + 1}` };
  }

  const dayLabel = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${today}T12:00:00Z`));

  return (
    <div className="container page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Recepción</p>
          <h1>Calendario de ocupación</h1>
          <p className="muted">Hacé click en una reserva para operar el mostrador.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNewBooking}>
          + Nueva reserva
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setMonth((current) => shiftMonth(current, -1))}
            aria-label="Mes anterior"
          >
            ←
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setMonth(monthOf())}
          >
            Hoy
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setMonth((current) => shiftMonth(current, 1))}
            aria-label="Mes siguiente"
          >
            →
          </button>
        </div>
        <h2 className="calendar-title">{monthLabel(month)}</h2>
        <div className="legend">
          <span className="legend-item">
            <i className="dot tone-confirmed" /> Confirmada
          </span>
          <span className="legend-item">
            <i className="dot tone-checked-in" /> En curso
          </span>
          <span className="legend-item">
            <i className="dot tone-completed" /> Completada
          </span>
          <span className="legend-item">
            <i className="dot tone-no-show" /> No presentado
          </span>
        </div>
      </div>

      {loading && !calendar ? (
        <PageLoader label="Cargando calendario…" />
      ) : calendar ? (
        <div className="calendar-scroll">
          <div className="calendar">
            <div className="cal-head">
              <div className="cal-room-head">Habitación</div>
              <div
                className="cal-day-heads"
                style={{ gridTemplateColumns: `repeat(${calendar.days.length}, minmax(38px, 1fr))` }}
              >
                {calendar.days.map((day) => (
                  <div
                    key={day}
                    className={`cal-day-head ${isWeekend(day) ? 'weekend' : ''} ${
                      day === today ? 'today' : ''
                    }`}
                  >
                    <span>{weekdayNarrow(day)}</span>
                    <strong>{Number(day.slice(8, 10))}</strong>
                  </div>
                ))}
              </div>
            </div>

            {calendar.rooms.map((room) => {
              const roomReservations = calendar.reservations.filter(
                (reservation) => reservation.roomId === room.id,
              );

              return (
                <div className="cal-row" key={room.id}>
                  <div className="cal-room-cell">
                    <strong>{room.number}</strong>
                    <span>{room.type}</span>
                    {!room.active && <em>Inactiva</em>}
                  </div>
                  <div
                    className="cal-track"
                    style={{
                      gridTemplateColumns: `repeat(${calendar.days.length}, minmax(38px, 1fr))`,
                    }}
                  >
                    {calendar.days.map((day) => (
                      <div
                        key={day}
                        className={`cal-cell ${isWeekend(day) ? 'weekend' : ''} ${
                          day === today ? 'today' : ''
                        }`}
                      />
                    ))}

                    {roomReservations.map((reservation) => (
                      <button
                        key={reservation.id}
                        type="button"
                        className={`cal-bar tone-${statusInfo(reservation.status).tone}`}
                        style={barStyle(reservation)}
                        onClick={() => setSelected(reservation)}
                        title={`${reservation.guestName} · ${formatDate(reservation.checkIn)} → ${formatDate(reservation.checkOut)}`}
                      >
                        <span className="cal-bar-name">
                          {reservation.guestName.split(' ')[0]}
                        </span>
                        <span className="cal-bar-nights">{reservation.nights}n</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <section className="card day-panel">
        <div className="day-panel-head">
          <div>
            <p className="eyebrow">Movimientos</p>
            <h2>Hoy · {dayLabel}</h2>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={loadDay}>
            Actualizar
          </button>
        </div>

        {dayLoading ? (
          <p className="muted">Cargando movimientos…</p>
        ) : dayReservations.length === 0 ? (
          <p className="muted">No hay llegadas, salidas ni estadías para hoy.</p>
        ) : (
          <div className="day-list">
            {dayReservations.map((reservation) => (
              <button
                type="button"
                key={reservation.id}
                className="day-row"
                onClick={() => setSelected(reservation)}
              >
                <span className="day-room">{reservation.room.number}</span>
                <span className="day-guest">
                  <strong>{reservation.guestName}</strong>
                  <small>
                    {formatDateShort(reservation.checkIn)} →{' '}
                    {formatDateShort(reservation.checkOut)}
                  </small>
                </span>
                <span className="day-tags">
                  {reservation.isArrival && <span className="chip">Llega</span>}
                  {reservation.isDeparture && <span className="chip">Sale</span>}
                </span>
                <StatusBadge status={reservation.status} />
                <span className="day-code">{reservation.code}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Reserva ${selected.code}` : ''}
        footer={
          selected ? (
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>
                Cerrar
              </button>
              {selected.status === 'CONFIRMED' && (
                <>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => runAction(selected, 'no-show')}
                    disabled={Boolean(actionBusy) || today < selected.checkIn}
                    title={
                      today < selected.checkIn
                        ? `Disponible desde el ${formatDate(selected.checkIn)}`
                        : undefined
                    }
                  >
                    No presentado
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => runAction(selected, 'check-in')}
                    disabled={Boolean(actionBusy) || today < selected.checkIn}
                    title={
                      today < selected.checkIn
                        ? `Disponible desde el ${formatDate(selected.checkIn)}`
                        : undefined
                    }
                  >
                    {actionBusy === 'check-in' ? 'Registrando…' : 'Check-in'}
                  </button>
                </>
              )}
              {selected.status === 'CHECKED_IN' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => runAction(selected, 'check-out')}
                  disabled={Boolean(actionBusy)}
                >
                  {actionBusy === 'check-out' ? 'Registrando…' : 'Check-out'}
                </button>
              )}
              {['PENDING', 'CONFIRMED'].includes(selected.status) && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={cancelSelected}
                  disabled={Boolean(actionBusy)}
                >
                  Cancelar
                </button>
              )}
            </div>
          ) : null
        }
      >
        {selected && (
          <div>
            <div className="detail-inline">
              <StatusBadge status={selected.status} />
              <span className="muted">
                {selected.status === 'CONFIRMED' && today < selected.checkIn
                  ? `Check-in disponible el ${formatDate(selected.checkIn)}`
                  : 'Reserva activa'}
              </span>
            </div>

            <dl className="detail-grid">
              <div>
                <dt>Habitación</dt>
                <dd>
                  {selected.room.number} · {selected.room.type}
                </dd>
              </div>
              <div>
                <dt>Huésped</dt>
                <dd>{selected.guestName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{selected.guestEmail}</dd>
              </div>
              {selected.guestPhone && (
                <div>
                  <dt>Teléfono</dt>
                  <dd>{selected.guestPhone}</dd>
                </div>
              )}
              <div>
                <dt>Entrada</dt>
                <dd>{formatDate(selected.checkIn, { long: true })}</dd>
              </div>
              <div>
                <dt>Salida</dt>
                <dd>{formatDate(selected.checkOut, { long: true })}</dd>
              </div>
              <div>
                <dt>Noches</dt>
                <dd>{selected.nights}</dd>
              </div>
              <div>
                <dt>Huéspedes</dt>
                <dd>{selected.guests}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{formatMoney(selected.totalPrice)}</dd>
              </div>
              {selected.checkInAt && (
                <div>
                  <dt>Check-in</dt>
                  <dd>{formatInstant(selected.checkInAt)}</dd>
                </div>
              )}
              {selected.checkOutAt && (
                <div>
                  <dt>Check-out</dt>
                  <dd>{formatInstant(selected.checkOutAt)}</dd>
                </div>
              )}
            </dl>

            {selected.isManual && <p className="tiny muted">Reserva creada por recepción.</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title="Nueva reserva manual"
        wide
      >
        <form className="form" onSubmit={handleCreateBooking}>
          {bookingError && <div className="alert error">{bookingError}</div>}

          <div className="form-row">
            <label className="field">
              <span>Habitación</span>
              <select
                value={bookingForm.roomId}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, roomId: event.target.value }))
                }
                required
              >
                <option value="">Elegí una habitación</option>
                {calendar?.rooms
                  .filter((room) => room.active)
                  .map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.number} · {room.type} (hasta {room.capacity})
                    </option>
                  ))}
              </select>
            </label>

            <label className="field">
              <span>Huéspedes</span>
              <select
                value={bookingForm.guests}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, guests: event.target.value }))
                }
              >
                {[1, 2, 3, 4, 5, 6].map((guests) => (
                  <option key={guests} value={guests}>
                    {guests}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span>Entrada</span>
              <input
                type="date"
                value={bookingForm.checkIn}
                min={today}
                onChange={(event) =>
                  setBookingForm((current) => ({
                    ...current,
                    checkIn: event.target.value,
                    checkOut:
                      current.checkOut <= event.target.value
                        ? addDaysISO(event.target.value, 1)
                        : current.checkOut,
                  }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Salida</span>
              <input
                type="date"
                value={bookingForm.checkOut}
                min={addDaysISO(bookingForm.checkIn, 1)}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, checkOut: event.target.value }))
                }
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span>Nombre del huésped</span>
              <input
                type="text"
                minLength={2}
                value={bookingForm.guestName}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, guestName: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={bookingForm.guestEmail}
                onChange={(event) =>
                  setBookingForm((current) => ({ ...current, guestEmail: event.target.value }))
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
              value={bookingForm.guestPhone}
              onChange={(event) =>
                setBookingForm((current) => ({ ...current, guestPhone: event.target.value }))
              }
            />
          </label>

          <div className="modal-inline-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setBookingOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={bookingBusy}>
              {bookingBusy ? 'Creando…' : 'Crear reserva'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
