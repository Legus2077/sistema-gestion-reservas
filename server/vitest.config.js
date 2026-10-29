import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL_TEST || 'mysql://root:@localhost:3306/hotel_test',
      JWT_SECRET: 'test-secret-para-vitest',
      MAIL_MODE: 'test',
      CLIENT_ORIGIN: 'http://localhost:5173',
      COOKIE_SECURE: 'false',
      CURRENCY: 'PEN',
    },
  },
});
