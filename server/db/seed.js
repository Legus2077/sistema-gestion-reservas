import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { connectionOptionsFromUrl } from './connection.js';

const isTest = process.argv.includes('--test');
const options = connectionOptionsFromUrl(
  process.env.DATABASE_URL,
  isTest ? { database: 'hotel_test', decimalNumbers: true } : { decimalNumbers: true },
);

const db = await mysql.createPool({ ...options, waitForConnections: true, connectionLimit: 5 });

const hash = (password) => bcrypt.hash(password, 12);

const users = [
  {
    email: 'admin@hotelaurora.test',
    name: 'Ana Administradora',
    role: 'ADMIN',
    password: 'Admin123!',
  },
  {
    email: 'recepcion@hotelaurora.test',
    name: 'Ramiro Recepción',
    role: 'RECEPTIONIST',
    password: 'Recepcion123!',
  },
  {
    email: 'cliente@hotelaurora.test',
    name: 'Carla Cliente',
    role: 'CLIENT',
    password: 'Cliente123!',
  },
];

const rooms = [
  { number: '101', type: 'Individual', capacity: 1, price: 120 },
  { number: '102', type: 'Doble', capacity: 2, price: 180 },
  { number: '103', type: 'Suite', capacity: 3, price: 280 },
];

try {
  for (const user of users) {
    await db.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         name = VALUES(name),
         role = VALUES(role)`,
      [user.email, await hash(user.password), user.name, user.role],
    );
  }

  for (const room of rooms) {
    await db.query(
      `INSERT INTO rooms (number, type, capacity, price_per_night, active)
       VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE
         type = VALUES(type),
         capacity = VALUES(capacity),
         price_per_night = VALUES(price_per_night)`,
      [room.number, room.type, room.capacity, room.price],
    );
  }

  await db.query(
    `INSERT INTO settings
       (id, hotel_name, hotel_email, check_in_time, check_out_time,
        cancellation_days, max_stay_nights, policy_text)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       hotel_name = VALUES(hotel_name),
       hotel_email = VALUES(hotel_email),
       check_in_time = VALUES(check_in_time),
       check_out_time = VALUES(check_out_time),
       cancellation_days = VALUES(cancellation_days),
       max_stay_nights = VALUES(max_stay_nights),
       policy_text = VALUES(policy_text)`,
    [
      'Hotel Aurora',
      'reservas@hotelaurora.test',
      '15:00',
      '11:00',
      3,
      30,
      'Podés cancelar sin cargo hasta 3 días antes de la fecha de check-in. ' +
        'Después de ese plazo, la cancelación no está disponible desde la web: ' +
        'comunicate con la recepción del hotel.',
    ],
  );

  console.log('Seed completado.');
  console.log('Usuarios demo:');
  for (const user of users) {
    console.log(`  ${user.role.padEnd(13)} ${user.email} / ${user.password}`);
  }
} finally {
  await db.end();
}
