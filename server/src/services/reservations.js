import { config } from '../config.js';
import { query, withTransaction } from '../db.js';
import { AppError, forbidden } from '../errors.js';
import { sendReservationEmail } from '../mailer.js';
import {
  addMonths,
  eachDate,
  formatDateAR,
  isDateOnly,
  roundMoney,
  todayUTC,
} from '../utils/dates.js';
import { generateReservationCode } from '../utils/codes.js';
import { optionalString, requireDate, requireEmail, requireInt, requireString } from '../utils/validate.js';
import { canCancel, validateStay } from './availability.js';
import { getSettings } from './settings.js';

const RESERVATION_SELECT = `
  SELECT r.*, rm.number AS room_number, rm.type AS room_type
    FROM reservations r
    JOIN rooms rm ON rm.id = r.room_id
`;

export function mapReservation(
  row,
  { isStaff = false, cancellationDays = Number(row.cancellation_days ?? 0) } = {},
) {
  const cancellation = canCancel({
    status: row.status,
    checkIn: row.check_in,
    cancellationDays,
    isStaff,
  });

  return {
    id: Number(row.id),
    code: row.code,
    room: {
      id: Number(row.room_id),
      number: row.room_number,
      type: row.room_type,
    },
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    guests: Number(row.guests),
    checkIn: row.check_in,
    checkOut: row.check_out,
    nights: Number(row.nights),
    totalPrice: Number(row.total_price),
    currency: config.currency,
    status: row.status,
    checkInAt: row.check_in_at,
    checkOutAt: row.check_out_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    isManual: row.user_id === null,
    canCancel: cancellation.allowed,
    cancelBlockedReason: cancellation.allowed ? null : cancellation.reason,
  };
}

async function findRawById(id) {
  const rows = await query(`${RESERVATION_SELECT} WHERE r.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

function emailPayload(reservation, settings) {
  return {
    ...reservation,
    roomNumber: reservation.room.number,
    roomType: reservation.room.type,
    settings,
  };
}

function notify(type, reservation, settings) {
  void sendReservationEmail({
    type,
    reservation: emailPayload(reservation, settings),
    settings,
  }).catch((error) => {
    console.error('[mail] No se pudo enviar el email:', error.message);
  });
}

/**
 * Crea una reserva dentro de una transacción.
 * Bloquea la fila de la habitación con FOR UPDATE, revalida capacidad,
 * estado y solapamiento, y calcula el total con la tarifa leída bajo el lock.
 */
export async function createReservation(input, { userId = null, createdById = null } = {}) {
  const settings = await getSettings();

  const roomId = requireInt(input.roomId, 'roomId', 1, 4294967295, 'La habitación');
  const checkIn = requireDate(input.checkIn, 'checkIn', 'La fecha de entrada');
  const checkOut = requireDate(input.checkOut, 'checkOut', 'La fecha de salida');
  const guestName = requireString(input.guestName, 'guestName', {
    min: 2,
    max: 120,
    label: 'El nombre del huésped',
  });
  const guestEmail = requireEmail(input.guestEmail, 'guestEmail');
  const guestPhone = optionalString(input.guestPhone, 'guestPhone', 40);

  const stay = validateStay({ checkIn, checkOut, guests: input.guests, settings });
  const code = generateReservationCode();

  const { insertId } = await withTransaction(async (connection) => {
    const [rooms] = await connection.query(
      `SELECT id, number, type, capacity, price_per_night, active
         FROM rooms
        WHERE id = ?
        FOR UPDATE`,
      [roomId],
    );

    const room = rooms[0];
    if (!room) {
      throw new AppError(404, 'ROOM_NOT_FOUND', 'La habitación no existe.');
    }
    if (!room.active) {
      throw new AppError(409, 'ROOM_UNAVAILABLE', 'La habitación no está disponible.');
    }
    if (Number(room.capacity) < stay.guests) {
      throw new AppError(
        409,
        'ROOM_UNAVAILABLE',
        `La habitación tiene capacidad para ${room.capacity} huéspedes.`,
      );
    }

    const [conflicts] = await connection.query(
      `SELECT id
         FROM reservations
        WHERE room_id = ?
          AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
          AND check_in < ?
          AND check_out > ?
        LIMIT 1
        FOR UPDATE`,
      [roomId, checkOut, checkIn],
    );

    if (conflicts.length > 0) {
      throw new AppError(
        409,
        'ROOM_UNAVAILABLE',
        'La habitación ya está reservada para alguna de esas noches.',
      );
    }

    const totalPrice = roundMoney(Number(room.price_per_night) * stay.nights);

    const [result] = await connection.query(
      `INSERT INTO reservations
         (code, room_id, user_id, created_by_id, guest_name, guest_email, guest_phone,
          guests, check_in, check_out, nights, total_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')`,
      [
        code,
        roomId,
        userId,
        createdById,
        guestName,
        guestEmail,
        guestPhone,
        stay.guests,
        checkIn,
        checkOut,
        stay.nights,
        totalPrice,
      ],
    );

    return { insertId: result.insertId };
  });

  const row = await findRawById(insertId);
  const reservation = mapReservation(row, { cancellationDays: settings.cancellationDays });
  reservation.roomNumber = row.room_number;
  reservation.roomType = row.room_type;
  notify('confirmation', reservation, settings);

  return reservation;
}

export async function listMine(userId) {
  const settings = await getSettings();
  const rows = await query(
    `${RESERVATION_SELECT}
      WHERE r.user_id = ?
      ORDER BY r.check_in DESC, r.id DESC`,
    [userId],
  );
  return rows.map((row) =>
    mapReservation(row, { cancellationDays: settings.cancellationDays }),
  );
}

export async function getReservation(id, user) {
  const settings = await getSettings();
  const reservationId = requireInt(id, 'id', 1, 4294967295, 'La reserva');
  const row = await findRawById(reservationId);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'La reserva no existe.');

  const isStaff = ['RECEPTIONIST', 'ADMIN'].includes(user.role);
  if (!isStaff && Number(row.user_id) !== user.id) throw forbidden();

  return mapReservation(row, {
    isStaff,
    cancellationDays: settings.cancellationDays,
  });
}

export async function cancelReservation(id, user, reason) {
  const settings = await getSettings();
  const reservationId = requireInt(id, 'id', 1, 4294967295, 'La reserva');
  const row = await findRawById(reservationId);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'La reserva no existe.');

  const isStaff = ['RECEPTIONIST', 'ADMIN'].includes(user.role);
  if (!isStaff && Number(row.user_id) !== user.id) throw forbidden();

  const cancellation = canCancel({
    status: row.status,
    checkIn: row.check_in,
    cancellationDays: settings.cancellationDays,
    isStaff,
  });

  if (!cancellation.allowed) {
    throw new AppError(409, 'CANCELLATION_NOT_ALLOWED', cancellation.reason);
  }

  const note = isStaff
    ? optionalString(reason, 'reason', 255) || 'Cancelada por recepción'
    : 'Cancelada por el huésped';

  const result = await query(
    `UPDATE reservations
        SET status = 'CANCELLED',
            cancelled_at = UTC_TIMESTAMP(),
            cancellation_reason = ?
      WHERE id = ?
        AND status IN ('PENDING', 'CONFIRMED')`,
    [note, reservationId],
  );

  if (result.affectedRows === 0) {
    throw new AppError(409, 'INVALID_TRANSITION', 'La reserva ya no se puede cancelar.');
  }

  const updated = await findRawById(reservationId);
  const reservation = mapReservation(updated, {
    isStaff,
    cancellationDays: settings.cancellationDays,
  });
  notify('cancellation', reservation, settings);

  return reservation;
}

const STAFF_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW'];

export async function getCalendar(month) {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'El mes debe tener el formato AAAA-MM.', [
      { field: 'month', message: 'Formato AAAA-MM.' },
    ]);
  }

  const settings = await getSettings();
  const monthStart = `${month}-01`;
  const monthEnd = addMonths(monthStart, 1);
  const days = eachDate(monthStart, monthEnd);

  const rooms = await query(
    `SELECT id, number, type, capacity, price_per_night, active
       FROM rooms
      ORDER BY number ASC`,
  );

  const rows = await query(
    `${RESERVATION_SELECT}
      WHERE r.status <> 'CANCELLED'
        AND r.check_in < ?
        AND r.check_out > ?
      ORDER BY r.check_in ASC, r.id ASC`,
    [monthEnd, monthStart],
  );

  return {
    month,
    monthStart,
    monthEnd,
    days,
    today: todayUTC(),
    settings,
    rooms: rooms.map((room) => ({
      id: Number(room.id),
      number: room.number,
      type: room.type,
      capacity: Number(room.capacity),
      pricePerNight: Number(room.price_per_night),
      active: Boolean(room.active),
    })),
    reservations: rows.map((row) => ({
      id: Number(row.id),
      code: row.code,
      roomId: Number(row.room_id),
      room: {
        id: Number(row.room_id),
        number: row.room_number,
        type: row.room_type,
      },
      guestName: row.guest_name,
      guestEmail: row.guest_email,
      guestPhone: row.guest_phone,
      guests: Number(row.guests),
      checkIn: row.check_in,
      checkOut: row.check_out,
      nights: Number(row.nights),
      totalPrice: Number(row.total_price),
      status: row.status,
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      isManual: row.user_id === null,
    })),
  };
}

export async function getDayReservations(date) {
  requireDate(date, 'date', 'La fecha');
  const settings = await getSettings();
  const rows = await query(
    `${RESERVATION_SELECT}
      WHERE r.status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW')
        AND r.check_in <= ?
        AND r.check_out >= ?
      ORDER BY r.check_in ASC, r.check_out ASC`,
    [date, date],
  );

  return rows
    .filter((row) => row.status !== 'CANCELLED')
    .map((row) => ({
      ...mapReservation(row, { cancellationDays: settings.cancellationDays }),
      isArrival: row.check_in === date,
      isDeparture: row.check_out === date,
    }));
}

export async function checkInReservation(id) {
  const settings = await getSettings();
  const reservationId = requireInt(id, 'id', 1, 4294967295, 'La reserva');
  const row = await findRawById(reservationId);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'La reserva no existe.');

  if (row.status !== 'CONFIRMED') {
    throw new AppError(409, 'INVALID_TRANSITION', 'Solo se puede hacer check-in de una reserva confirmada.');
  }
  if (todayUTC() < row.check_in) {
    throw new AppError(
      409,
      'INVALID_TRANSITION',
      `El check-in corresponde recién el ${formatDateAR(row.check_in)}.`,
    );
  }

  const result = await query(
    `UPDATE reservations
        SET status = 'CHECKED_IN', check_in_at = UTC_TIMESTAMP()
      WHERE id = ? AND status = 'CONFIRMED'`,
    [reservationId],
  );
  if (result.affectedRows === 0) {
    throw new AppError(409, 'INVALID_TRANSITION', 'No se pudo registrar el check-in.');
  }

  return mapReservation(await findRawById(reservationId), {
    isStaff: true,
    cancellationDays: settings.cancellationDays,
  });
}

export async function checkOutReservation(id) {
  const settings = await getSettings();
  const reservationId = requireInt(id, 'id', 1, 4294967295, 'La reserva');
  const row = await findRawById(reservationId);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'La reserva no existe.');

  if (row.status !== 'CHECKED_IN') {
    throw new AppError(409, 'INVALID_TRANSITION', 'Solo se puede hacer check-out de una reserva en curso.');
  }

  const result = await query(
    `UPDATE reservations
        SET status = 'COMPLETED', check_out_at = UTC_TIMESTAMP()
      WHERE id = ? AND status = 'CHECKED_IN'`,
    [reservationId],
  );
  if (result.affectedRows === 0) {
    throw new AppError(409, 'INVALID_TRANSITION', 'No se pudo registrar el check-out.');
  }

  return mapReservation(await findRawById(reservationId), {
    isStaff: true,
    cancellationDays: settings.cancellationDays,
  });
}

export async function markNoShow(id) {
  const settings = await getSettings();
  const reservationId = requireInt(id, 'id', 1, 4294967295, 'La reserva');
  const row = await findRawById(reservationId);
  if (!row) throw new AppError(404, 'NOT_FOUND', 'La reserva no existe.');

  if (row.status !== 'CONFIRMED') {
    throw new AppError(409, 'INVALID_TRANSITION', 'Solo se puede marcar como no presentada una reserva confirmada.');
  }
  if (todayUTC() < row.check_in) {
    throw new AppError(
      409,
      'INVALID_TRANSITION',
      `La reserva comienza el ${formatDateAR(row.check_in)}; todavía no se puede marcar como no presentada.`,
    );
  }

  const result = await query(
    `UPDATE reservations SET status = 'NO_SHOW' WHERE id = ? AND status = 'CONFIRMED'`,
    [reservationId],
  );
  if (result.affectedRows === 0) {
    throw new AppError(409, 'INVALID_TRANSITION', 'No se pudo actualizar la reserva.');
  }

  return mapReservation(await findRawById(reservationId), {
    isStaff: true,
    cancellationDays: settings.cancellationDays,
  });
}

export async function getReservationRaw(id) {
  return findRawById(Number(id));
}

export function isStaffUser(user) {
  return ['RECEPTIONIST', 'ADMIN'].includes(user?.role);
}

export const RESERVATION_STATUSES = STAFF_STATUSES;
