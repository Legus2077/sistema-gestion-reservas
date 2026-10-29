import { query } from '../db.js';
import { AppError } from '../errors.js';
import { requireInt, requireNumber, requireString } from '../utils/validate.js';

export function mapRoom(row) {
  return {
    id: Number(row.id),
    number: row.number,
    type: row.type,
    capacity: Number(row.capacity),
    pricePerNight: Number(row.price_per_night),
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseActive(value, fallback = true) {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  throw new AppError(400, 'VALIDATION_ERROR', 'El campo active debe ser verdadero o falso.', [
    { field: 'active', message: 'Valor inválido.' },
  ]);
}

function roomFields(input) {
  return {
    number: requireString(input.number, 'number', { max: 10, label: 'El número de habitación' }),
    type: requireString(input.type, 'type', { max: 60, label: 'El tipo de habitación' }),
    capacity: requireInt(input.capacity, 'capacity', 1, 6, 'La capacidad'),
    pricePerNight: requireNumber(
      input.pricePerNight,
      'pricePerNight',
      0.01,
      10000000,
      'El precio por noche',
    ),
    active: parseActive(input.active, true),
  };
}

async function duplicateGuard(fn) {
  try {
    return await fn();
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new AppError(409, 'DUPLICATE_ROOM', 'Ya existe una habitación con ese número.');
    }
    throw error;
  }
}

export async function listRooms() {
  const rows = await query('SELECT * FROM rooms ORDER BY number ASC');
  return rows.map(mapRoom);
}

export async function createRoom(input) {
  const fields = roomFields(input);
  const result = await duplicateGuard(() =>
    query(
      `INSERT INTO rooms (number, type, capacity, price_per_night, active)
       VALUES (?, ?, ?, ?, ?)`,
      [fields.number, fields.type, fields.capacity, fields.pricePerNight, fields.active ? 1 : 0],
    ),
  );
  const rows = await query('SELECT * FROM rooms WHERE id = ?', [result.insertId]);
  return mapRoom(rows[0]);
}

export async function updateRoom(id, input) {
  const roomId = requireInt(id, 'id', 1, 4294967295, 'La habitación');
  const rows = await query('SELECT * FROM rooms WHERE id = ? LIMIT 1', [roomId]);
  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'La habitación no existe.');

  const current = mapRoom(rows[0]);
  const fields = roomFields({
    number: input.number ?? current.number,
    type: input.type ?? current.type,
    capacity: input.capacity ?? current.capacity,
    pricePerNight: input.pricePerNight ?? current.pricePerNight,
    active: input.active ?? current.active,
  });

  await duplicateGuard(() =>
    query(
      `UPDATE rooms
          SET number = ?, type = ?, capacity = ?, price_per_night = ?, active = ?
        WHERE id = ?`,
      [fields.number, fields.type, fields.capacity, fields.pricePerNight, fields.active ? 1 : 0, roomId],
    ),
  );

  const updated = await query('SELECT * FROM rooms WHERE id = ?', [roomId]);
  return mapRoom(updated[0]);
}

export async function deleteRoom(id) {
  const roomId = requireInt(id, 'id', 1, 4294967295, 'La habitación');
  const rows = await query('SELECT id FROM rooms WHERE id = ? LIMIT 1', [roomId]);
  if (!rows[0]) throw new AppError(404, 'NOT_FOUND', 'La habitación no existe.');

  const [{ total }] = await query('SELECT COUNT(*) AS total FROM reservations WHERE room_id = ?', [
    roomId,
  ]);
  if (Number(total) > 0) {
    throw new AppError(
      409,
      'ROOM_HAS_RESERVATIONS',
      'La habitación tiene reservas asociadas. Desactivala en lugar de eliminarla.',
    );
  }

  await query('DELETE FROM rooms WHERE id = ?', [roomId]);
}
