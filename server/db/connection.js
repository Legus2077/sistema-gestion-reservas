import 'dotenv/config';

/**
 * Convierte DATABASE_URL en opciones de mysql2.
 * Ej: mysql://root:clave@localhost:3306/hotel_reservas
 */
export function connectionOptionsFromUrl(rawUrl, overrides = {}) {
  if (!rawUrl) {
    throw new Error('Falta DATABASE_URL en el archivo server/.env');
  }

  const url = new URL(rawUrl);

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    charset: 'utf8mb4',
    ...overrides,
  };
}
