import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { pool } from '../../src/db.js';
import { outbox } from '../../src/mailer.js';
import { addDays, todayUTC } from '../../src/utils/dates.js';
import { resetTestDb } from '../helpers/db.js';

const today = todayUTC();
const base = addDays(today, 20);

function booking(overrides = {}) {
  return {
    roomId: 2,
    checkIn: base,
    checkOut: addDays(base, 2),
    guests: 2,
    guestName: 'Lucía Test',
    guestEmail: 'lucia@test.local',
    guestPhone: '11 5555 0000',
    ...overrides,
  };
}

describe('flujo de reserva', () => {
  let client;
  let staff;
  let firstReservation;

  beforeAll(async () => {
    await resetTestDb();
    outbox.length = 0;

    client = request.agent(app);
    const register = await client.post('/api/auth/register').send({
      name: 'Lucía Test',
      email: 'lucia@test.local',
      password: 'Password123!',
    });
    expect(register.status).toBe(201);
    expect(register.body.data.user.role).toBe('CLIENT');

    staff = request.agent(app);
    const login = await staff.post('/api/auth/login').send({
      email: 'recepcion@test.local',
      password: 'Recepcion123!',
    });
    expect(login.status).toBe(200);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('devuelve solo habitaciones con capacidad suficiente', async () => {
    const response = await client
      .get('/api/availability')
      .query({ checkIn: base, checkOut: addDays(base, 2), guests: 2 });

    expect(response.status).toBe(200);
    expect(response.body.data.nights).toBe(2);
    expect(response.body.data.rooms.map((room) => room.number)).toEqual(['102', '103']);
    expect(response.body.data.rooms[0].totalPrice).toBe(104000);
  });

  it('no ofrece habitaciones si los huéspedes superan la capacidad máxima', async () => {
    const response = await client
      .get('/api/availability')
      .query({ checkIn: base, checkOut: addDays(base, 2), guests: 4 });

    expect(response.status).toBe(200);
    expect(response.body.data.rooms).toEqual([]);
  });

  it('crea la reserva, calcula el total en el servidor y envía email', async () => {
    const response = await client.post('/api/reservations').send(booking());

    expect(response.status).toBe(201);
    const reservation = response.body.data.reservation;
    firstReservation = reservation;

    expect(reservation.status).toBe('CONFIRMED');
    expect(reservation.code).toMatch(/^RSV-/);
    expect(reservation.nights).toBe(2);
    expect(reservation.totalPrice).toBe(104000);
    expect(reservation.canCancel).toBe(true);

    const email = outbox.find((message) => message.subject.includes(reservation.code));
    expect(email).toBeTruthy();
    expect(email.subject).toMatch(/confirmada/i);
    expect(email.to).toBe('lucia@test.local');
  });

  it('rechaza una segunda reserva con noches solapadas', async () => {
    const response = await client.post('/api/reservations').send(
      booking({
        checkIn: addDays(base, 1),
        checkOut: addDays(base, 3),
      }),
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ROOM_UNAVAILABLE');
  });

  it('permite reservar noches contiguas (check-out == check-in)', async () => {
    const response = await client.post('/api/reservations').send(
      booking({
        checkIn: addDays(base, 2),
        checkOut: addDays(base, 4),
      }),
    );

    expect(response.status).toBe(201);
    expect(response.body.data.reservation.checkIn).toBe(addDays(base, 2));
  });

  it('serializa dos reservas simultáneas: una gana y la otra recibe 409', async () => {
    const concurrent = booking({
      roomId: 3,
      guests: 2,
      checkIn: addDays(base, 6),
      checkOut: addDays(base, 8),
    });

    const [first, second] = await Promise.all([
      client.post('/api/reservations').send(concurrent),
      client.post('/api/reservations').send(concurrent),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const conflict = first.status === 409 ? first : second;
    expect(conflict.body.error.code).toBe('ROOM_UNAVAILABLE');
  });

  it('lista las reservas del cliente', async () => {
    const response = await client.get('/api/reservations/mine');

    expect(response.status).toBe(200);
    const codes = response.body.data.reservations.map((reservation) => reservation.code);
    expect(codes).toContain(firstReservation.code);
  });

  it('cancela dentro de la política, libera la habitación y envía email', async () => {
    const response = await client.post(`/api/reservations/${firstReservation.id}/cancel`);

    expect(response.status).toBe(200);
    expect(response.body.data.reservation.status).toBe('CANCELLED');
    expect(response.body.data.reservation.cancelledAt).toBeTruthy();

    const email = outbox.find(
      (message) =>
        message.subject.includes(firstReservation.code) && /cancelada/i.test(message.subject),
    );
    expect(email).toBeTruthy();

    const availability = await client
      .get('/api/availability')
      .query({ checkIn: base, checkOut: addDays(base, 2), guests: 2 });

    expect(availability.body.data.rooms.map((room) => room.number)).toContain('102');
  });

  it('no permite cancelar con menos días que la política', async () => {
    const response = await client.post('/api/reservations').send(
      booking({
        roomId: 1,
        guests: 1,
        checkIn: addDays(today, 1),
        checkOut: addDays(today, 2),
      }),
    );

    expect(response.status).toBe(201);

    const cancel = await client.post(
      `/api/reservations/${response.body.data.reservation.id}/cancel`,
    );

    expect(cancel.status).toBe(409);
    expect(cancel.body.error.code).toBe('CANCELLATION_NOT_ALLOWED');
  });

  it('excluye habitaciones inactivas de la disponibilidad', async () => {
    await pool.query('UPDATE rooms SET active = 0 WHERE id = 3');

    const response = await client
      .get('/api/availability')
      .query({
        checkIn: addDays(base, 12),
        checkOut: addDays(base, 14),
        guests: 3,
      });

    expect(response.body.data.rooms).toEqual([]);

    await pool.query('UPDATE rooms SET active = 1 WHERE id = 3');
  });

  it('permite a recepción hacer check-in y check-out', async () => {
    const created = await client.post('/api/reservations').send(
      booking({
        roomId: 1,
        guests: 1,
        checkIn: today,
        checkOut: addDays(today, 1),
      }),
    );

    expect(created.status).toBe(201);
    const id = created.body.data.reservation.id;

    const checkIn = await staff.post(`/api/reception/reservations/${id}/check-in`);
    expect(checkIn.status).toBe(200);
    expect(checkIn.body.data.reservation.status).toBe('CHECKED_IN');
    expect(checkIn.body.data.reservation.checkInAt).toBeTruthy();

    const checkOut = await staff.post(`/api/reception/reservations/${id}/check-out`);
    expect(checkOut.status).toBe(200);
    expect(checkOut.body.data.reservation.status).toBe('COMPLETED');
    expect(checkOut.body.data.reservation.checkOutAt).toBeTruthy();
  });

  it('protege las rutas de recepción para clientes', async () => {
    const response = await client.get('/api/reception/calendar');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
