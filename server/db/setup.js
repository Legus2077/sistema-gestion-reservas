import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { connectionOptionsFromUrl } from './connection.js';

const isReset = process.argv.includes('--reset');
const isTest = process.argv.includes('--test');

const options = connectionOptionsFromUrl(process.env.DATABASE_URL);
const databaseName = isTest ? 'hotel_test' : options.database;

if (!databaseName) {
  throw new Error('DATABASE_URL debe incluir el nombre de la base (ej: /hotel_reservas)');
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
    `CREATE DATABASE IF NOT EXISTS \`${databaseName}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.query(`USE \`${databaseName}\``);

  if (isReset) {
    console.log(`Eliminando tablas de "${databaseName}"...`);
    await connection.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      DROP TABLE IF EXISTS reservations;
      DROP TABLE IF EXISTS rooms;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS settings;
      SET FOREIGN_KEY_CHECKS = 1;
    `);
  }

  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await connection.query(schema);
  console.log(`Base de datos "${databaseName}" lista.`);
} finally {
  await connection.end();
}
