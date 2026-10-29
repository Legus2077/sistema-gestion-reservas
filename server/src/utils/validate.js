import { AppError } from '../errors.js';
import { isDateOnly, TIME_RE } from './dates.js';

export function fail(field, message) {
  throw new AppError(400, 'VALIDATION_ERROR', message, [{ field, message }]);
}

export function requireString(value, field, { min = 1, max = 200, label = field } = {}) {
  if (typeof value !== 'string') {
    fail(field, `${label} es obligatorio.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    fail(field, `${label} debe tener al menos ${min} caracteres.`);
  }
  if (trimmed.length > max) {
    fail(field, `${label} no puede superar los ${max} caracteres.`);
  }
  return trimmed;
}

export function optionalString(value, field, max = 200) {
  if (value === undefined || value === null || value === '') return null;
  return requireString(value, field, { max });
}

export function requireEmail(value, field = 'email') {
  const email = requireString(value, field, { max: 190, label: 'El email' }).toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!valid) {
    fail(field, 'Ingresá un email válido.');
  }
  return email;
}

export function requireInt(value, field, min, max, label = field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    fail(field, `${label} debe ser un número entero entre ${min} y ${max}.`);
  }
  return number;
}

export function requireNumber(value, field, min, max, label = field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    fail(field, `${label} debe ser un número entre ${min} y ${max}.`);
  }
  return Math.round(number * 100) / 100;
}

export function requireDate(value, field, label = field) {
  if (!isDateOnly(value)) {
    fail(field, `${label} debe tener el formato AAAA-MM-DD.`);
  }
  return value;
}

export function requireTime(value, field, label = field) {
  if (typeof value !== 'string' || !TIME_RE.test(value)) {
    fail(field, `${label} debe tener el formato HH:MM.`);
  }
  return value;
}

export function requireOneOf(value, field, allowed, label = field) {
  if (!allowed.includes(value)) {
    fail(field, `${label} debe ser uno de: ${allowed.join(', ')}.`);
  }
  return value;
}
