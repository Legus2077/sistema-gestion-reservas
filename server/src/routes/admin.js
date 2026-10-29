import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { createRoom, deleteRoom, listRooms, updateRoom } from '../services/rooms.js';
import { getSettings } from '../services/settings.js';
import { updateSettings } from '../services/settingsUpdate.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/rooms', async (_req, res) => {
  const rooms = await listRooms();
  res.json({ data: { rooms } });
});

adminRouter.post('/rooms', async (req, res) => {
  const room = await createRoom(req.body);
  res.status(201).json({ data: { room } });
});

adminRouter.patch('/rooms/:id', async (req, res) => {
  const room = await updateRoom(req.params.id, req.body);
  res.json({ data: { room } });
});

adminRouter.delete('/rooms/:id', async (req, res) => {
  await deleteRoom(req.params.id);
  res.status(204).end();
});

adminRouter.get('/settings', async (_req, res) => {
  const settings = await getSettings();
  res.json({ data: { settings } });
});

adminRouter.put('/settings', async (req, res) => {
  const settings = await updateSettings(req.body);
  res.json({ data: { settings } });
});
