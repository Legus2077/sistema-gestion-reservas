import { config } from '../config.js';
import { query } from '../db.js';
import { AppError } from '../errors.js';

export function mapSettings(row) {
  return {
    hotelName: row.hotel_name,
    hotelEmail: row.hotel_email,
    checkInTime: row.check_in_time,
    checkOutTime: row.check_out_time,
    cancellationDays: Number(row.cancellation_days),
    maxStayNights: Number(row.max_stay_nights),
    policyText: row.policy_text,
    currency: config.currency,
  };
}

export async function getSettings() {
  const rows = await query('SELECT * FROM settings WHERE id = 1 LIMIT 1');
  if (!rows[0]) {
    throw new AppError(
      500,
      'SETTINGS_MISSING',
      'La configuración del hotel no está inicializada. Ejecutá npm run db:seed.',
    );
  }
  return mapSettings(rows[0]);
}
