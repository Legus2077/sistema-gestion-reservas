import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { unauthorized } from '../errors.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[config.cookieName];
    if (!token) throw unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw unauthorized('Tu sesión venció. Volvé a iniciar sesión.');
    }

    const rows = await query(
      'SELECT id, email, name, role FROM users WHERE id = ? LIMIT 1',
      [payload.sub],
    );
    if (!rows[0]) throw unauthorized();

    req.user = {
      id: Number(rows[0].id),
      email: rows[0].email,
      name: rows[0].name,
      role: rows[0].role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function setSessionCookie(res, user) {
  const token = jwt.sign({ sub: user.id }, config.jwtSecret, {
    expiresIn: `${config.sessionHours}h`,
  });

  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: config.sessionHours * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
  });
}

export function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
