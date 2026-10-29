import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { connectionOptionsFromUrl } from '../../db/connection.js';

/**
 * Recrea la base hotel_test con el schema y datos mínimos.
 * No toca la base de desarrollo.
 */
export async function resetTestDb() {
  const options = connectionOptionsFromUrl(process.env.DATABASE_URL);

  if (!options.database.endsWith('_test')) {
    throw new Error(`Por seguridad, los tests solo corren contra una base *_test (recibido: ${options.database})`);
  }

  const connection = await mysql.createConnection({
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${options.database}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.query(`USE \`${options.database}\``);
    await connection.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      DROP TABLE IF EXISTS reservations;
      DROP TABLE IF EXISTS rooms;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS settings;
      SET FOREIGN_KEY_CHECKS = 1;
    `);

    const schema = await readFile(new URL('../../db/schema.sql', import.meta.url), 'utf8');
    await connection.query(schema);

    await connection.query(
      `INSERT INTO settings
         (id, hotel_name, hotel_email, check_in_time, check_out_time,
          cancellation_days, max_stay_nights, policy_text)
       VALUES (1, 'Hotel Test', 'reservas@test.local', '15:00', '11:00', 3, 30,
               'Cancelación sin cargo hasta 3 días antes del check-in.')`,
    );

    await connection.query(
      `INSERT INTO rooms (id, number, type, capacity, price_per_night, active)
       VALUES (1, '101', 'Individual', 1, 38000, 1),
              (2, '102', 'Doble', 2, 52000, 1),
              (3, '103', 'Suite', 3, 78000, 1)`,
    );

    const receptionHash = await bcrypt.hash('Recepcion123!', 10);
    await connection.query(
      `INSERT INTO users (id, email, password_hash, name, role)
       VALUES (10, 'recepcion@test.local', ?, 'Recepción Test', 'RECEPTIONIST')`,
      [receptionHash],
    );
  } finally {
    await connection.end();
  }
}
