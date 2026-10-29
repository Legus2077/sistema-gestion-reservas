import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  cancelReservation,
  createReservation,
  getReservation,
  listMine,
} from '../services/reservations.js';

export const reservationsRouter = Router();

reservationsRouter.use(requireAuth);

reservationsRouter.get('/mine', requireRole('CLIENT'), async (req, res) => {
  const reservations = await listMine(req.user.id);
  res.json({ data: { reservations } });
});

reservationsRouter.post('/', requireRole('CLIENT'), async (req, res) => {
  const reservation = await createReservation(req.body, { userId: req.user.id });
  res.status(201).json({ data: { reservation } });
});

reservationsRouter.get('/:id', async (req, res) => {
  const reservation = await getReservation(req.params.id, req.user);
  res.json({ data: { reservation } });
});

reservationsRouter.post('/:id/cancel', async (req, res) => {
  const reservation = await cancelReservation(req.params.id, req.user, req.body?.reason);
  res.json({ data: { reservation } });
});
