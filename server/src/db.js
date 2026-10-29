import mysql from 'mysql2/promise';
import { config } from './config.js';
import { connectionOptionsFromUrl } from '../db/connection.js';

const options = connectionOptionsFromUrl(config.databaseUrl);

export const pool = mysql.createPool({
  ...options,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  decimalNumbers: true,
  charset: 'utf8mb4',
});

// Todos los DATETIME se guardan y leen en UTC, sin importar la zona del servidor.
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Ejecuta fn dentro de una transacción. Si fn lanza, se hace rollback.
 * fn recibe la conexión para poder usar SELECT ... FOR UPDATE.
 */
export async function withTransaction(fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
