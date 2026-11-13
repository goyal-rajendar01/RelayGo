-- ============================================================
-- RelayGo Database Schema
-- Run this file against an empty MySQL database named 'relaygo'
-- Usage: mysql -u root -p relaygo < schema.sql
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS disputes;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS ratings_reviews;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS otp_verifications;
DROP TABLE IF EXISTS delivery_requests;
DROP TABLE IF EXISTS packages;
DROP TABLE IF EXISTS journeys;
DROP TABLE IF EXISTS traveler_profiles;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------
-- users
-- ----------------------------------------------------------------
CREATE TABLE users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  role          ENUM('sender','traveler','admin') NOT NULL DEFAULT 'sender',
  is_active     BOOLEAN DEFAULT TRUE,
  is_suspended  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------
-- traveler_profiles
-- ----------------------------------------------------------------
CREATE TABLE traveler_profiles (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  user_id             INT NOT NULL UNIQUE,
  id_type             VARCHAR(50),
  id_number           VARCHAR(100),
  verification_status ENUM('pending','verified','rejected') DEFAULT 'pending',
  verified_at         TIMESTAMP NULL,
  avg_rating          DECIMAL(3,2) DEFAULT 0.00,
  total_deliveries    INT DEFAULT 0,
  bio                 TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------
-- journeys
-- ----------------------------------------------------------------
CREATE TABLE journeys (
  id                 INT PRIMARY KEY AUTO_INCREMENT,
  traveler_id        INT NOT NULL,
  from_location      VARCHAR(200) NOT NULL,
  to_location        VARCHAR(200) NOT NULL,
  departure_date     DATE NOT NULL,
  departure_time     TIME,
  available_capacity DECIMAL(5,2) NOT NULL,
  remaining_capacity DECIMAL(5,2) NOT NULL,
  expected_reward    DECIMAL(10,2) NOT NULL,
  notes              TEXT,
  status             ENUM('active','completed','cancelled') DEFAULT 'active',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (traveler_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------
-- packages
-- ----------------------------------------------------------------
CREATE TABLE packages (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  sender_id      INT NOT NULL,
  title          VARCHAR(200) NOT NULL,
  description    TEXT,
  from_location  VARCHAR(200) NOT NULL,
  to_location    VARCHAR(200) NOT NULL,
  preferred_date DATE NOT NULL,
  weight         DECIMAL(5,2) NOT NULL,
  dimensions     VARCHAR(100),
  category       VARCHAR(100),
  budget         DECIMAL(10,2) NOT NULL,
  status         ENUM('open','requested','accepted','picked_up','in_transit','delivered','cancelled','disputed') DEFAULT 'open',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------
-- delivery_requests
-- ----------------------------------------------------------------
CREATE TABLE delivery_requests (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  package_id    INT NOT NULL,
  journey_id    INT NOT NULL,
  traveler_id   INT NOT NULL,
  sender_id     INT NOT NULL,
  status        ENUM('pending','accepted','rejected','cancelled') DEFAULT 'pending',
  message       TEXT,
  agreed_reward DECIMAL(10,2),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id)  REFERENCES packages(id),
  FOREIGN KEY (journey_id)  REFERENCES journeys(id),
  FOREIGN KEY (traveler_id) REFERENCES users(id),
  FOREIGN KEY (sender_id)   REFERENCES users(id),
  UNIQUE KEY unique_package_journey (package_id, journey_id)
);

-- ----------------------------------------------------------------
-- otp_verifications
-- ----------------------------------------------------------------
CREATE TABLE otp_verifications (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  package_id INT NOT NULL,
  otp_type   ENUM('pickup','delivery') NOT NULL,
  otp_code   VARCHAR(10) NOT NULL,
  is_used    BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  used_at    TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES packages(id),
  UNIQUE KEY unique_package_otp_type (package_id, otp_type)
);

-- ----------------------------------------------------------------
-- transactions
-- ----------------------------------------------------------------
CREATE TABLE transactions (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  package_id          INT NOT NULL,
  delivery_request_id INT NOT NULL,
  sender_id           INT NOT NULL,
  traveler_id         INT NOT NULL,
  amount              DECIMAL(10,2) NOT NULL,
  status              ENUM('held','released','refunded') DEFAULT 'held',
  held_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_at         TIMESTAMP NULL,
  FOREIGN KEY (package_id)          REFERENCES packages(id),
  FOREIGN KEY (delivery_request_id) REFERENCES delivery_requests(id),
  FOREIGN KEY (sender_id)           REFERENCES users(id),
  FOREIGN KEY (traveler_id)         REFERENCES users(id)
);

-- ----------------------------------------------------------------
-- ratings_reviews
-- ----------------------------------------------------------------
CREATE TABLE ratings_reviews (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  package_id  INT NOT NULL UNIQUE,
  sender_id   INT NOT NULL,
  traveler_id INT NOT NULL,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review      TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id)  REFERENCES packages(id),
  FOREIGN KEY (sender_id)   REFERENCES users(id),
  FOREIGN KEY (traveler_id) REFERENCES users(id)
);

-- ----------------------------------------------------------------
-- reports
-- ----------------------------------------------------------------
CREATE TABLE reports (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  reporter_id      INT NOT NULL,
  reported_user_id INT,
  package_id       INT,
  reason           VARCHAR(200) NOT NULL,
  description      TEXT,
  status           ENUM('open','investigating','resolved') DEFAULT 'open',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id)      REFERENCES users(id),
  FOREIGN KEY (reported_user_id) REFERENCES users(id),
  FOREIGN KEY (package_id)       REFERENCES packages(id)
);

-- ----------------------------------------------------------------
-- disputes
-- ----------------------------------------------------------------
CREATE TABLE disputes (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  package_id  INT NOT NULL,
  raised_by   INT NOT NULL,
  reason      VARCHAR(200) NOT NULL,
  description TEXT,
  status      ENUM('open','investigating','resolved','closed') DEFAULT 'open',
  resolution  TEXT,
  resolved_by INT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (package_id)  REFERENCES packages(id),
  FOREIGN KEY (raised_by)   REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);
