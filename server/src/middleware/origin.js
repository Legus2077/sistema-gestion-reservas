import { config } from '../config.js';

/**
 * Protección CSRF básica: si el navegador manda Origin, debe ser el del cliente.
 * Los requests sin Origin (curl, tests, healthchecks) se permiten.
 */
export function originCheck(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.headers.origin;
  if (!origin) return next();

  let allowed = false;
  try {
    const originUrl = new URL(origin);
    const requestOrigin = `${req.protocol}://${req.get('host')}`;
    allowed =
      originUrl.origin === new URL(config.clientOrigin).origin ||
      originUrl.origin === requestOrigin;
  } catch {
    allowed = false;
  }

  if (!allowed) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Origen no permitido.' },
    });
  }

  next();
}
