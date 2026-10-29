import { query } from '../db.js';
import { requireEmail, requireInt, requireString, requireTime } from '../utils/validate.js';
import { getSettings } from './settings.js';

export async function updateSettings(input) {
  const current = await getSettings();

  const hotelName = requireString(input.hotelName ?? current.hotelName, 'hotelName', {
    max: 120,
    label: 'El nombre del hotel',
  });
  const hotelEmail = requireEmail(input.hotelEmail ?? current.hotelEmail, 'hotelEmail');
  const checkInTime = requireTime(
    input.checkInTime ?? current.checkInTime,
    'checkInTime',
    'El horario de check-in',
  );
  const checkOutTime = requireTime(
    input.checkOutTime ?? current.checkOutTime,
    'checkOutTime',
    'El horario de check-out',
  );
  const cancellationDays = requireInt(
    input.cancellationDays ?? current.cancellationDays,
    'cancellationDays',
    0,
    60,
    'Los días de anticipación',
  );
  const maxStayNights = requireInt(
    input.maxStayNights ?? current.maxStayNights,
    'maxStayNights',
    1,
    90,
    'El máximo de noches',
  );
  const policyText = requireString(input.policyText ?? current.policyText, 'policyText', {
    min: 10,
    max: 2000,
    label: 'La política de cancelación',
  });

  await query(
    `UPDATE settings
        SET hotel_name = ?, hotel_email = ?, check_in_time = ?, check_out_time = ?,
            cancellation_days = ?, max_stay_nights = ?, policy_text = ?
      WHERE id = 1`,
    [
      hotelName,
      hotelEmail,
      checkInTime,
      checkOutTime,
      cancellationDays,
      maxStayNights,
      policyText,
    ],
  );

  return getSettings();
}
