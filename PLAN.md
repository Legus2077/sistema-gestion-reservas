# Plan — Sistema de reservas (MVP)

## Stack

- **Frontend:** React + Vite + JavaScript, CSS propio, `fetch`.
- **Backend:** Node.js + Express + JavaScript, SQL directo con `mysql2`.
- **Base de datos:** MySQL de XAMPP (MariaDB 10.4), puerto 3306.
- **Auth:** JWT en cookie httpOnly + bcrypt.
- **Emails:** Nodemailer (modo consola por defecto).
- **Tests:** Vitest + Supertest.



## Alcance

- **Cliente:** buscar disponibilidad por fechas y huéspedes, reservar y cancelar.
- **Recepción:** calendario mensual, reservas manuales, check-in, check-out, no presentado.
- **Admin:** CRUD de habitaciones, tarifas, horarios y política de cancelación.
- **Estados:** pendiente, confirmada, cancelada, en curso, completada, no presentado.
- **Reglas:** noches `[check-in, check-out)`, sin solapamientos, lock de fila en transacción,
  capacidad suficiente, total calculado en el servidor, cancelación con X días de anticipación.
- **Fechas:** días de estadía como fecha calendario (`YYYY-MM-DD`); instantes en UTC y
  mostrados en la zona horaria del navegador.

## Orden

1. Schema SQL + seed.
2. API (auth, habitaciones, settings, disponibilidad, reservas, recepción).
3. Disponibilidad transaccional + tests.
4. Frontend cliente.
5. Panel de recepción + admin.
6. README (sin Docker).

## Base de datos local

```powershell
# Iniciar MySQL desde el panel de XAMPP
npm run db:setup
npm run db:seed
```

Usuarios demo (contraseñas en el README).
