export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha de hoy en UTC, formato YYYY-MM-DD. */
export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export function isDateOnly(value) {
  if (typeof value !== 'string' || !DATE_ONLY_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Noches entre dos fechas YYYY-MM-DD (checkOut - checkIn). */
export function nightsBetween(checkIn, checkOut) {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  return Math.round((end - start) / DAY_MS);
}

/** Días desde hoy (UTC) hasta una fecha YYYY-MM-DD. */
export function daysUntil(date, today = todayUTC()) {
  return nightsBetween(today, date);
}

/**
 * Dos rangos de noches [entrada, salida) se solapan si
 * el inicio de uno es anterior al fin del otro y viceversa.
 * Con strings YYYY-MM-DD alcanza la comparación lexicográfica.
 */
export function overlaps(aCheckIn, aCheckOut, bCheckIn, bCheckOut) {
  return aCheckIn < bCheckOut && aCheckOut > bCheckIn;
}

export function addDays(date, days) {
  const timestamp = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS;
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function addMonths(date, months) {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, day));
  return target.toISOString().slice(0, 10);
}

export function eachDate(start, endExclusive) {
  const days = [];
  let cursor = start;
  while (cursor < endExclusive) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

/** Día calendario para mostrar: 05/11/2026. */
export function formatDateAR(date) {
  if (!date) return '';
  const [year, month, day] = date.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/** Instante UTC (DATETIME de MySQL) para mostrar en la zona del usuario. */
export function formatInstant(value, timeZone = 'UTC') {
  if (!value) return null;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  }).format(date);
}

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
