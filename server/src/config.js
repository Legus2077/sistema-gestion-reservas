import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Falta la variable de entorno ${key} (revisá server/.env)`);
  }
}

export const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  isTest: process.env.NODE_ENV === 'test',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  cookieName: 'hotel_token',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  sessionHours: 8,
  mailMode: process.env.MAIL_MODE || 'console',
  mailFrom: process.env.MAIL_FROM || 'Hotel Aurora <reservas@hotelaurora.test>',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  currency: process.env.CURRENCY || 'PEN',
  maxGuests: 6,
});
