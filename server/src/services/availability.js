import { config } from '../config.js';
import { query } from '../db.js';
import { AppError } from '../errors.js';
import {
  daysUntil,
  nightsBetween,
  roundMoney,
  todayUTC,
} from '../utils/dates.js';
import { requireDate, requireInt } from '../utils/validate.js';
import { getSettings } from './settings.js';

export const BLOCKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN'];
export const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];

/**
 * Valida una estadía y devuelve la cantidad de noches.
 * Reglas: entrada hoy o futuro, salida posterior, máximo de noches y huéspedes.
 */
export function validateStay({ checkIn, checkOut, guests, settings, today = todayUTC() }) {
  requireDate(checkIn, 'checkIn', 'La fecha de entrada');
  requireDate(checkOut, 'checkOut', 'La fecha de salida');
  const guestCount = requireInt(guests, 'guests', 1, config.maxGuests, 'La cantidad de huéspedes');

  if (checkIn < today) {
    throw new AppError(400, 'VALIDATION_ERROR', 'La fecha de entrada no puede ser anterior a hoy.', [
      { field: 'checkIn', message: 'La fecha de entrada no puede ser anterior a hoy.' },
    ]);
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) {
    throw new AppError(400, 'VALIDATION_ERROR', 'La fecha de salida debe ser posterior a la de entrada.', [
      { field: 'checkOut', message: 'La salida debe ser posterior a la entrada.' },
    ]);
  }

  if (nights > settings.maxStayNights) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `La estadía no puede superar las ${settings.maxStayNights} noches.`,
      [{ field: 'checkOut', message: `Máximo ${settings.maxStayNights} noches.` }],
    );
  }

  return { nights, guests: guestCount };
}

/**
 * Determina si una reserva se puede cancelar según la política.
 * Staff puede cancelar siempre (queda registrado).
 */
export function canCancel({
  status,
  checkIn,
  cancellationDays,
  isStaff = false,
  today = todayUTC(),
}) {
  if (!CANCELLABLE_STATUSES.includes(status)) {
    return {
      allowed: false,
      daysUntil: daysUntil(checkIn, today),
      reason: 'Solo se pueden cancelar reservas pendientes o confirmadas.',
    };
  }

  const remaining = daysUntil(checkIn, today);
  if (isStaff) return { allowed: true, daysUntil: remaining, reason: null };

  if (remaining <= cancellationDays) {
    return {
      allowed: false,
      daysUntil: remaining,
      reason:
        remaining < 0
          ? 'La reserva ya comenzó o finalizó.'
          : `Solo se puede cancelar con más de ${cancellationDays} días de anticipación. Faltan ${remaining} día${remaining === 1 ? '' : 's'}.`,
    };
  }

  return { allowed: true, daysUntil: remaining, reason: null };
}

/**
 * Habitaciones activas, con capacidad suficiente y sin noches ocupadas.
 * La regla de solapamiento es [checkIn, checkOut): salida 10 / entrada 10 no choca.
 */
export async function searchAvailability({ checkIn, checkOut, guests }) {
  const settings = await getSettings();
  const stay = validateStay({ checkIn, checkOut, guests, settings });

  const rooms = await query(
    `SELECT id, number, type, capacity, price_per_night
       FROM rooms
      WHERE active = 1
        AND capacity >= ?
        AND NOT EXISTS (
          SELECT 1
            FROM reservations r
           WHERE r.room_id = rooms.id
             AND r.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
             AND r.check_in < ?
             AND r.check_out > ?
        )
      ORDER BY price_per_night ASC, number ASC`,
    [stay.guests, checkOut, checkIn],
  );

  return {
    checkIn,
    checkOut,
    nights: stay.nights,
    guests: stay.guests,
    currency: config.currency,
    rooms: rooms.map((room) => ({
      id: Number(room.id),
      number: room.number,
      type: room.type,
      capacity: Number(room.capacity),
      pricePerNight: Number(room.price_per_night),
      totalPrice: roundMoney(Number(room.price_per_night) * stay.nights),
    })),
  };
}
