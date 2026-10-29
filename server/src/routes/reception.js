import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  checkInReservation,
  checkOutReservation,
  createReservation,
  getCalendar,
  getDayReservations,
  markNoShow,
} from '../services/reservations.js';
import { todayUTC } from '../utils/dates.js';

export const receptionRouter = Router();

receptionRouter.use(requireAuth, requireRole('RECEPTIONIST', 'ADMIN'));

receptionRouter.get('/calendar', async (req, res) => {
  const month = req.query.month || todayUTC().slice(0, 7);
  const calendar = await getCalendar(month);
  res.json({ data: calendar });
});

receptionRouter.get('/reservations', async (req, res) => {
  const date = req.query.date || todayUTC();
  const reservations = await getDayReservations(date);
  res.json({ data: { date, reservations } });
});

receptionRouter.post('/reservations', async (req, res) => {
  const reservation = await createReservation(req.body, {
    userId: null,
    createdById: req.user.id,
  });
  res.status(201).json({ data: { reservation } });
});

receptionRouter.post('/reservations/:id/check-in', async (req, res) => {
  const reservation = await checkInReservation(req.params.id);
  res.json({ data: { reservation } });
});

receptionRouter.post('/reservations/:id/check-out', async (req, res) => {
  const reservation = await checkOutReservation(req.params.id);
  res.json({ data: { reservation } });
});

receptionRouter.post('/reservations/:id/no-show', async (req, res) => {
  const reservation = await markNoShow(req.params.id);
  res.json({ data: { reservation } });
});
