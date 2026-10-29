export const STATUS = {
  PENDING: { label: 'Pendiente', tone: 'pending' },
  CONFIRMED: { label: 'Confirmada', tone: 'confirmed' },
  CHECKED_IN: { label: 'En curso', tone: 'checked-in' },
  COMPLETED: { label: 'Completada', tone: 'completed' },
  CANCELLED: { label: 'Cancelada', tone: 'cancelled' },
  NO_SHOW: { label: 'No presentado', tone: 'no-show' },
};

export const ROLE_LABELS = {
  CLIENT: 'Cliente',
  RECEPTIONIST: 'Recepción',
  ADMIN: 'Administración',
};

function parseDateOnly(value) {
  return new Date(`${value}T12:00:00Z`);
}

export function formatDate(value, { long = false } = {}) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: long ? 'long' : 'short',
    year: 'numeric',
    ...(long ? { weekday: 'long' } : {}),
    timeZone: 'UTC',
  }).format(parseDateOnly(value.slice(0, 10)));
}

export function formatDateShort(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(parseDateOnly(value.slice(0, 10)));
}

export function formatMoney(value, currency = 'PEN') {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

/** Instantes guardados en UTC por MySQL, mostrados en la zona del navegador. */
export function formatInstant(value) {
  if (!value) return null;
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function addDaysISO(value, days) {
  const timestamp = Date.parse(`${value}T00:00:00Z`) + days * 86400000;
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function monthOf(value = todayISO()) {
  return value.slice(0, 7);
}

export function shiftMonth(month, amount) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
}

export function monthLabel(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1, 12)));
}

export function weekdayNarrow(date) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'narrow',
    timeZone: 'UTC',
  }).format(parseDateOnly(date));
}

export function isWeekend(date) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function daysBetween(checkIn, checkOut) {
  return Math.round(
    (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000,
  );
}

export function statusInfo(status) {
  return STATUS[status] || { label: status, tone: 'pending' };
}
