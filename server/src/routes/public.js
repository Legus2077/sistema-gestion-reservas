import { Router } from 'express';
import { searchAvailability } from '../services/availability.js';
import { getSettings } from '../services/settings.js';

export const publicRouter = Router();

publicRouter.get('/availability', async (req, res) => {
  const availability = await searchAvailability({
    checkIn: req.query.checkIn,
    checkOut: req.query.checkOut,
    guests: req.query.guests,
  });
  res.json({ data: availability });
});

publicRouter.get('/settings/public', async (_req, res) => {
  const settings = await getSettings();
  res.json({ data: settings });
});
