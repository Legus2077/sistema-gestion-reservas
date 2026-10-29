import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.isTest,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Demasiados intentos. Esperá unos minutos y volvé a probar.',
    },
  },
});
