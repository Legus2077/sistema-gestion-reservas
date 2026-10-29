# Hotel Aurora — Sistema de reservas (MVP)

Sistema web de reservas para un hotel pequeño de 3 habitaciones. Cliente, recepción y
administración, con disponibilidad en tiempo real y emails de confirmación/cancelación.

## Stack

Tres capas, sin vueltas:

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + JavaScript, CSS propio, `fetch` |
| Backend | Node.js + Express + JavaScript, SQL directo con `mysql2` |
| Base de datos | MySQL de XAMPP (MariaDB 10.4) |

Otras piezas: JWT en cookie httpOnly, bcrypt, Nodemailer, Vitest y Supertest.

**No usa** TypeScript, Prisma, Tailwind, TanStack Query ni Docker.

## Funcionalidades

- **Cliente:** busca disponibilidad por fechas y huéspedes, ve el precio total, reserva y
  cancela según la política del hotel.
- **Recepción:** calendario mensual de ocupación, movimientos del día, reservas manuales y
  acciones de check-in, check-out y no presentado.
- **Administración:** CRUD de habitaciones (número, tipo, capacidad, tarifa, activa) y
  configuración de horarios, política de cancelación y datos del hotel.
- **Emails:** confirmación y cancelación con Nodemailer. Por defecto se imprimen en la
  terminal (modo consola); opcionalmente SMTP real.

## Requisitos

- Node.js 20 o superior (probado con 24).
- XAMPP instalado, con el módulo **MySQL iniciado** desde el panel.
- Puerto 3306 libre (lo usa XAMPP).

## Puesta en marcha

```powershell
# 1. Iniciar MySQL desde el panel de XAMPP

# 2. Instalar dependencias (workspaces client + server)
npm install

# 3. Crear la configuración local
Copy-Item server/.env.example server/.env
#    Revisá DATABASE_URL y cambiá JWT_SECRET antes de publicar.

# 4. Crear la base y las tablas
npm run db:setup

# 5. Cargar habitaciones, configuración y usuarios demo
npm run db:seed

# 6. Levantar API + frontend
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000
- Healthcheck: http://localhost:3000/api/health

### Usuarios demo

| Rol | Email | Contraseña |
|---|---|---|
| Cliente | `cliente@hotelaurora.test` | `Cliente123!` |
| Recepción | `recepcion@hotelaurora.test` | `Recepcion123!` |
| Admin | `admin@hotelaurora.test` | `Admin123!` |

También podés crear una cuenta de cliente desde `/register`. Los roles de recepción y
administración solo se asignan por base de datos o seed.

### Habitaciones demo

| Número | Tipo | Capacidad | Tarifa |
|---|---|---|---|
| 101 | Individual | 1 | S/ 120 |
| 102 | Doble | 2 | S/ 180 |
| 103 | Suite | 3 | S/ 280 |

Los precios demo están expresados en soles peruanos (PEN). Podés cambiarlos desde el panel de administración.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | API con watch + Vite en paralelo |
| `npm run build` | Build de producción del cliente |
| `npm start` | API en modo normal |
| `npm run db:setup` | Crea la base y aplica `server/db/schema.sql` |
| `npm run db:seed` | Datos demo (idempotente) |
| `npm run db:reset` | Borra las tablas, las recrea y vuelve a sembrar |
| `npm test` | Unitarios + integración |
| `npm run test:unit -w server` | Solo unitarios |
| `npm run test:integration -w server` | Solo integración |

## Estructura

```
Proyecto Web 7/
├─ client/
│  ├─ index.html
│  ├─ vite.config.js          # proxy /api → localhost:3000
│  └─ src/
│     ├─ api.js               # fetch + errores uniformes
│     ├─ auth.jsx             # sesión y roles
│     ├─ components/          # layout, modal, badges, toasts, guards
│     ├─ pages/               # búsqueda, reserva, recepción, admin
│     └─ utils.js             # formato de fechas, dinero y estados
├─ server/
│  ├─ db/
│  │  ├─ schema.sql           # tablas, índices y constraints
│  │  ├─ setup.js             # crea base + aplica schema
│  │  └─ seed.js              # habitaciones, settings y usuarios
│  ├─ src/
│  │  ├─ app.js               # Express (testeable con Supertest)
│  │  ├─ server.js            # listen + cierre ordenado
│  │  ├─ db.js                # pool, query y transacciones
│  │  ├─ mailer.js            # Nodemailer / consola / test
│  │  ├─ middleware/          # auth, roles, CSRF, errores, rate limit
│  │  ├─ routes/              # auth, públicas, reservas, recepción, admin
│  │  ├─ services/            # disponibilidad, reservas, habitaciones, settings
│  │  └─ utils/               # fechas, validación, códigos
│  └─ tests/                  # unitarios e integración
├─ PLAN.md
└─ README.md
```

## Reglas de negocio

### Noches y solapamientos

Una reserva ocupa las noches `[check_in, check_out)`: la noche de salida no se ocupa. Dos
rangos se solapan si `existente.check_in < nueva.check_out` **y**
`existente.check_out > nueva.check_in`.

Por eso una salida el 10 y una entrada el 10 **no** chocan.

Bloquean disponibilidad los estados `PENDING`, `CONFIRMED` y `CHECKED_IN`. `CANCELLED` y
`NO_SHOW` liberan la habitación.

### Transacción y concurrencia

La creación de reservas corre dentro de una transacción:

1. `SELECT ... FROM rooms WHERE id = ? FOR UPDATE` bloquea la habitación.
2. Se revalida que esté activa y tenga capacidad.
3. Se busca solapamiento con `FOR UPDATE`.
4. Se calcula el total con la tarifa leída bajo el lock y se inserta.

Si dos personas reservan a la vez, una gana y la otra recibe `409 ROOM_UNAVAILABLE`.
El test de integración lo comprueba con dos requests en paralelo.

### Precio

`total = precio_por_noche × noches`, calculado **siempre en el servidor** dentro de la
transacción. El cliente nunca define el precio. Las reservas existentes conservan su total
si después cambia la tarifa.

### Capacidad y habitaciones inactivas

Solo se ofrecen habitaciones `active = 1` con `capacity >= huéspedes`. La búsqueda pública
no muestra habitaciones inactivas ni con noches ocupadas.

### Cancelación

El cliente puede cancelar solo si faltan **más** de `cancellation_days` días para el
check-in (configurable por admin). Si la política es 3 días, con 4 días de anticipación se
puede; con 3, no. Recepción y admin pueden cancelar fuera de la política; queda registrado
en la reserva.

### Estados

| Estado | Significado |
|---|---|
| `PENDING` | Pendiente (reservado para una futura integración de pagos) |
| `CONFIRMED` | Confirmada; ocupa noches |
| `CHECKED_IN` | Huésped en el hotel |
| `COMPLETED` | Check-out realizado |
| `CANCELLED` | Cancelada; libera noches |
| `NO_SHOW` | No se presentó; libera noches |

Transiciones: `CONFIRMED → CHECKED_IN → COMPLETED`, `CONFIRMED → NO_SHOW` y
`PENDING/CONFIRMED → CANCELLED`. Cualquier otra devuelve `409 INVALID_TRANSITION`.

### Fechas

- Fechas de estadía: `DATE`, viajan como `YYYY-MM-DD` y se muestran como fecha calendario
  (sin convertir zona horaria, para evitar corrimientos de un día).
- Instantes (`created_at`, `check_in_at`, `cancelled_at`): se guardan en **UTC** y el
  navegador los muestra en la zona horaria del usuario.
- El pool de MySQL fija `time_zone = '+00:00'` en cada conexión.

## API

Todas las respuestas usan `{ "data": ... }` o `{ "error": { "code", "message", "details?" } }`.

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/auth/register` | público |
| POST | `/api/auth/login` | público |
| POST | `/api/auth/logout` | auth |
| GET | `/api/auth/me` | auth |
| GET | `/api/availability?checkIn&checkOut&guests` | público |
| GET | `/api/settings/public` | público |
| POST | `/api/reservations` | cliente |
| GET | `/api/reservations/mine` | cliente |
| GET | `/api/reservations/:id` | dueño o staff |
| POST | `/api/reservations/:id/cancel` | dueño o staff |
| GET | `/api/reception/calendar?month=AAAA-MM` | recepción/admin |
| GET | `/api/reception/reservations?date=AAAA-MM-DD` | recepción/admin |
| POST | `/api/reception/reservations` | recepción/admin |
| POST | `/api/reception/reservations/:id/check-in` | recepción/admin |
| POST | `/api/reception/reservations/:id/check-out` | recepción/admin |
| POST | `/api/reception/reservations/:id/no-show` | recepción/admin |
| GET/POST | `/api/admin/rooms` | admin |
| PATCH/DELETE | `/api/admin/rooms/:id` | admin |
| GET/PUT | `/api/admin/settings` | admin |
| GET | `/api/health` | público |

Autenticación: JWT de 8 horas en cookie `httpOnly` + `SameSite=Lax`, contraseñas con bcrypt
(12 rondas). Los cambios de estado validan el header `Origin` contra `CLIENT_ORIGIN`.

## Tests

```powershell
npm test
```

- **Unitarios:** solapamientos (incluidos los bordes check-out == check-in), cálculo de
  noches, capacidad, política de cancelación en el límite exacto y validaciones de fechas.
- **Integración:** registro/login, disponibilidad por capacidad, creación de reserva,
  email, bloqueo de solapadas, noches contiguas, concurrencia (201 + 409), listado,
  cancelación, liberación de la habitación, política, habitación inactiva y check-in/out
  desde recepción.

La integración usa la base **`hotel_test`** en el mismo XAMPP. El helper la recrea en cada
corrida y se niega a ejecutar si el nombre no termina en `_test`. La base de desarrollo no
se toca.

## Emails

`server/.env`:

```env
MAIL_MODE=console
MAIL_FROM="Hotel Aurora <reservas@hotelaurora.test>"
```

- `console` (default): imprime destinatario, asunto y texto en la terminal.
- `test`: guarda en memoria (usado por Vitest).
- `smtp`: envía de verdad.

Para SMTP:

```env
MAIL_MODE=smtp
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario
SMTP_PASS=clave
```

Un fallo de email no cancela la reserva: se registra en consola.

## Configuración

| Variable | Default | Descripción |
|---|---|---|
| `DATABASE_URL` | `mysql://root:@localhost:3306/hotel_reservas` | Conexión MySQL |
| `PORT` | `3000` | Puerto de la API |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origen permitido para CORS/CSRF |
| `JWT_SECRET` | — | Obligatorio; usar un secreto largo |
| `COOKIE_SECURE` | `false` | `true` solo con HTTPS |
| `MAIL_MODE` | `console` | `console`, `test` o `smtp` |
| `MAIL_FROM` | Hotel Aurora | Remitente |
| `CURRENCY` | `PEN` | Moneda ISO 4217 (PEN = soles) |

## Producción (sin Docker)

```powershell
npm run build                 # genera client/dist
$env:NODE_ENV="production"
npm start                     # Express sirve la API y client/dist
```

Con `NODE_ENV=production`, Express sirve el build del cliente y hace fallback a
`index.html` para las rutas de React. Configurá `CLIENT_ORIGIN` con el dominio real,
`COOKIE_SECURE=true` y HTTPS.

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `ECONNREFUSED 127.0.0.1:3306` | Iniciar MySQL desde el panel de XAMPP |
| `Access denied for user 'root'` | Poner la contraseña en `DATABASE_URL` (codificada) |
| `Table 'settings' doesn't exist` | Ejecutar `npm run db:setup` y `npm run db:seed` |
| Los tests fallan por base | Verificar que XAMPP esté arriba y `hotel_test` pueda crearse |
| El login no persiste | Usar el frontend por `localhost:5173` (proxy) o configurar `CLIENT_ORIGIN` |
| Emails no llegan | En desarrollo es esperable: `MAIL_MODE=console` |

## Fuera de alcance

Pagos online, tarifas estacionales, múltiples hoteles, recuperación de contraseña,
facturación, i18n y app móvil.
