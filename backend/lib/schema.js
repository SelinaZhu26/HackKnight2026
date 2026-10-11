// mochii club schema for Tiger Data (TimescaleDB on Postgres). Applied by lib/db.js; safe to re-run.
// Statements between the timescale markers only run when the TimescaleDB extension is available.
export const SCHEMA = String.raw`
-- mochii club on Tiger Data (TimescaleDB on Postgres).
-- Applied automatically on first API request (backend/lib/db.js); safe to re-run.
-- The TimescaleDB section at the end only runs when the extension is available,
-- so the same schema also works on plain Postgres for local development.

CREATE TABLE IF NOT EXISTS users (
  id         uuid PRIMARY KEY,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now()
);

-- Every purchase is a point in time: the natural fit for a hypertable.
CREATE TABLE IF NOT EXISTS transactions (
  user_id  uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  ts       timestamptz NOT NULL,
  merchant text NOT NULL,
  category text NOT NULL,
  amount   numeric(12, 2) NOT NULL CHECK (amount > 0),
  source   text NOT NULL DEFAULT 'demo',
  UNIQUE (user_id, ts, merchant, amount)
);
CREATE INDEX IF NOT EXISTS transactions_user_ts ON transactions (user_id, ts DESC);

-- Learning activity (lessons, practice) for streaks and progress over time.
CREATE TABLE IF NOT EXISTS learn_events (
  user_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  ts        timestamptz NOT NULL DEFAULT now(),
  kind      text NOT NULL,
  lesson_id text,
  xp        integer NOT NULL DEFAULT 0,
  accuracy  real,
  UNIQUE (user_id, ts, kind)
);
CREATE INDEX IF NOT EXISTS learn_events_user_ts ON learn_events (user_id, ts DESC);

-- timescale:begin
SELECT create_hypertable('transactions', 'ts', chunk_time_interval => INTERVAL '30 days', if_not_exists => TRUE, migrate_data => TRUE);
SELECT create_hypertable('learn_events', 'ts', chunk_time_interval => INTERVAL '30 days', if_not_exists => TRUE, migrate_data => TRUE);

-- Daily spend per user and category, maintained incrementally by TimescaleDB.
-- materialized_only = false keeps brand-new purchases visible before the next refresh.
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_spend
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT user_id, time_bucket(INTERVAL '1 day', ts) AS day, category, sum(amount) AS total, count(*) AS purchases
FROM transactions
GROUP BY user_id, day, category
WITH NO DATA;

SELECT add_continuous_aggregate_policy('daily_spend',
  start_offset => INTERVAL '3 years', end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '10 minutes', if_not_exists => TRUE);
-- timescale:end
`;
