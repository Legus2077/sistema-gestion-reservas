import { randomBytes } from 'node:crypto';

/** Código público legible, sin caracteres ambiguos. */
export function generateReservationCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(8);
  let code = '';
  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }
  return `RSV-${code}`;
}
