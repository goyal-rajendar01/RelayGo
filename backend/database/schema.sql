-- RelayGo PostgreSQL schema. Safe to run repeatedly on the same database.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  role          VARCHAR(20) NOT NULL DEFAULT 'sender'
                CHECK (role IN ('sender', 'traveler', 'admin')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_suspended  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS traveler_profiles (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  id_type             VARCHAR(50),
  id_number           VARCHAR(100),
  verification_status VARCHAR(20) DEFAULT 'pending'
                      CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_at         TIMESTAMPTZ,
  avg_rating          DECIMAL(3,2) DEFAULT 0.00,
  total_deliveries    INTEGER DEFAULT 0,
  bio                 TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journeys (
  id                 SERIAL PRIMARY KEY,
  traveler_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_location      VARCHAR(200) NOT NULL,
  to_location        VARCHAR(200) NOT NULL,
  departure_date     DATE NOT NULL,
  departure_time     TIME,
  available_capacity DECIMAL(5,2) NOT NULL,
  remaining_capacity DECIMAL(5,2) NOT NULL,
  expected_reward    DECIMAL(10,2) NOT NULL,
  notes              TEXT,
  status             VARCHAR(20) DEFAULT 'active'
                     CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packages (
  id             SERIAL PRIMARY KEY,
  sender_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          VARCHAR(200) NOT NULL,
  description    TEXT,
  from_location  VARCHAR(200) NOT NULL,
  to_location    VARCHAR(200) NOT NULL,
  preferred_date DATE NOT NULL,
  weight         DECIMAL(5,2) NOT NULL,
  dimensions     VARCHAR(100),
  category       VARCHAR(100),
  budget         DECIMAL(10,2) NOT NULL,
  status         VARCHAR(40) DEFAULT 'open'
                 CHECK (status IN (
                   'open', 'requested', 'accepted', 'picked_up', 'in_transit',
                   'delivered_pending_confirmation', 'delivered', 'cancelled', 'disputed'
                 )),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_requests (
  id            SERIAL PRIMARY KEY,
  package_id    INTEGER NOT NULL REFERENCES packages(id),
  journey_id    INTEGER NOT NULL REFERENCES journeys(id),
  traveler_id   INTEGER NOT NULL REFERENCES users(id),
  sender_id     INTEGER NOT NULL REFERENCES users(id),
  status        VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message       TEXT,
  agreed_reward DECIMAL(10,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (package_id, journey_id)
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id         SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES packages(id),
  otp_type   VARCHAR(20) NOT NULL CHECK (otp_type IN ('pickup', 'delivery')),
  otp_code   VARCHAR(10) NOT NULL,
  is_used    BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (package_id, otp_type)
);

CREATE TABLE IF NOT EXISTS transactions (
  id                  SERIAL PRIMARY KEY,
  package_id          INTEGER NOT NULL REFERENCES packages(id),
  delivery_request_id  INTEGER NOT NULL REFERENCES delivery_requests(id),
  sender_id           INTEGER NOT NULL REFERENCES users(id),
  traveler_id         INTEGER NOT NULL REFERENCES users(id),
  amount              DECIMAL(10,2) NOT NULL,
  status              VARCHAR(20) DEFAULT 'held'
                      CHECK (status IN ('held', 'released', 'refunded')),
  held_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  released_at         TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ratings_reviews (
  id          SERIAL PRIMARY KEY,
  package_id  INTEGER NOT NULL UNIQUE REFERENCES packages(id),
  sender_id   INTEGER NOT NULL REFERENCES users(id),
  traveler_id INTEGER NOT NULL REFERENCES users(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id               SERIAL PRIMARY KEY,
  reporter_id      INTEGER NOT NULL REFERENCES users(id),
  reported_user_id INTEGER REFERENCES users(id),
  package_id       INTEGER REFERENCES packages(id),
  reason           VARCHAR(200) NOT NULL,
  description      TEXT,
  status           VARCHAR(20) DEFAULT 'open'
                   CHECK (status IN ('open', 'investigating', 'resolved')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS disputes (
  id          SERIAL PRIMARY KEY,
  package_id  INTEGER NOT NULL REFERENCES packages(id),
  raised_by   INTEGER NOT NULL REFERENCES users(id),
  reason      VARCHAR(200) NOT NULL,
  description TEXT,
  status      VARCHAR(20) DEFAULT 'open'
              CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution  TEXT,
  resolved_by INTEGER REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS packages_set_updated_at ON packages;
CREATE TRIGGER packages_set_updated_at
BEFORE UPDATE ON packages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS delivery_requests_set_updated_at ON delivery_requests;
CREATE TRIGGER delivery_requests_set_updated_at
BEFORE UPDATE ON delivery_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
