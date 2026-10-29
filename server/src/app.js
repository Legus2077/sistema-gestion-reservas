import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { query } from './db.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { originCheck } from './middleware/origin.js';
import { authRouter } from './routes/auth.js';
import { publicRouter } from './routes/public.js';
import { reservationsRouter } from './routes/reservations.js';
import { receptionRouter } from './routes/reception.js';
import { adminRouter } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(originCheck);

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ data: { status: 'ok', database: 'up' } });
  } catch {
    res.status(503).json({
      error: { code: 'DATABASE_DOWN', message: 'No se puede conectar con la base de datos.' },
    });
  }
});

app.use('/api/auth', authRouter);
app.use('/api', publicRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/reception', receptionRouter);
app.use('/api/admin', adminRouter);

if (config.isProduction) {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);
