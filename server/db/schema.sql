-- Esquema de la base de datos del hotel.
-- Fechas de estadía: DATE (día calendario, sin zona horaria).
-- Instantes (check-in real, cancelación): DATETIME en UTC.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role ENUM('CLIENT', 'RECEPTIONIST', 'ADMIN') NOT NULL DEFAULT 'CLIENT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  number VARCHAR(10) NOT NULL,
  type VARCHAR(60) NOT NULL,
  capacity TINYINT UNSIGNED NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rooms_number (number),
  KEY idx_rooms_active_capacity (active, capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reservations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,
  room_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NULL,
  created_by_id INT UNSIGNED NULL,
  guest_name VARCHAR(120) NOT NULL,
  guest_email VARCHAR(190) NOT NULL,
  guest_phone VARCHAR(40) NULL,
  guests TINYINT UNSIGNED NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights SMALLINT UNSIGNED NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW')
    NOT NULL DEFAULT 'CONFIRMED',
  check_in_at DATETIME NULL,
  check_out_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancellation_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reservations_code (code),
  KEY idx_reservations_room_dates (room_id, check_in, check_out),
  KEY idx_reservations_status_date (status, check_in),
  KEY idx_reservations_user (user_id),
  CONSTRAINT fk_reservations_room FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_reservations_user FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_reservations_created_by FOREIGN KEY (created_by_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_reservations_dates CHECK (check_out > check_in),
  CONSTRAINT chk_reservations_nights CHECK (nights > 0),
  CONSTRAINT chk_reservations_guests CHECK (guests > 0),
  CONSTRAINT chk_reservations_total CHECK (total_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  hotel_name VARCHAR(120) NOT NULL,
  hotel_email VARCHAR(190) NOT NULL,
  check_in_time VARCHAR(5) NOT NULL DEFAULT '15:00',
  check_out_time VARCHAR(5) NOT NULL DEFAULT '11:00',
  cancellation_days INT UNSIGNED NOT NULL DEFAULT 3,
  max_stay_nights INT UNSIGNED NOT NULL DEFAULT 30,
  policy_text TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_settings_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
