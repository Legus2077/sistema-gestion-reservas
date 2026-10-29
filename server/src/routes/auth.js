import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { AppError } from '../errors.js';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  clearSessionCookie,
  publicUser,
  requireAuth,
  setSessionCookie,
} from '../middleware/auth.js';
import { requireEmail, requireString } from '../utils/validate.js';

export const authRouter = Router();

authRouter.post('/register', authLimiter, async (req, res) => {
  const name = requireString(req.body?.name, 'name', { min: 2, max: 120, label: 'El nombre' });
  const email = requireEmail(req.body?.email);
  const password = requireString(req.body?.password, 'password', {
    min: 8,
    max: 72,
    label: 'La contraseña',
  });

  const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existing.length > 0) {
    throw new AppError(409, 'EMAIL_IN_USE', 'Ya existe una cuenta con ese email.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let insertId;
  try {
    const result = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES (?, ?, ?, 'CLIENT')`,
      [email, passwordHash, name],
    );
    insertId = result.insertId;
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new AppError(409, 'EMAIL_IN_USE', 'Ya existe una cuenta con ese email.');
    }
    throw error;
  }

  const user = { id: Number(insertId), name, email, role: 'CLIENT' };
  setSessionCookie(res, user);

  res.status(201).json({ data: { user: publicUser(user) } });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const email = requireEmail(req.body?.email);
  const password = requireString(req.body?.password, 'password', {
    max: 72,
    label: 'La contraseña',
  });

  const rows = await query(
    'SELECT id, email, name, role, password_hash FROM users WHERE email = ? LIMIT 1',
    [email],
  );
  const user = rows[0];

  const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos.');
  }

  setSessionCookie(res, user);
  res.json({ data: { user: publicUser(user) } });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ data: { user: publicUser(req.user) } });
});

authRouter.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});
