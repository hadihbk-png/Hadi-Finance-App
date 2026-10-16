-- FINORA database schema
-- Safe to run repeatedly: every object is created only if it does not exist yet.
-- All money is stored in AED as NUMERIC(14,2). Never floating point.

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  full_name      VARCHAR(120) NOT NULL,
  phone          VARCHAR(30),
  date_of_birth  DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_profiles (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  monthly_income         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_income >= 0),
  monthly_expenses       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_expenses >= 0),
  total_savings          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_savings >= 0),
  total_investments      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_investments >= 0),
  total_debt             NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_debt >= 0),
  monthly_debt_payments  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_debt_payments >= 0),
  emergency_fund         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (emergency_fund >= 0),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  VARCHAR(120) NOT NULL,
  category              VARCHAR(30) NOT NULL CHECK (category IN
                          ('Emergency Fund','Home','Education','Retirement','Travel','Wealth','Other')),
  target_amount         NUMERIC(14,2) NOT NULL CHECK (target_amount > 0),
  current_amount        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  monthly_contribution  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_contribution >= 0),
  target_date           DATE,
  status                VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','achieved','paused')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

CREATE TABLE IF NOT EXISTS risk_questions (
  id           SERIAL PRIMARY KEY,
  question     TEXT NOT NULL,
  order_index  INTEGER NOT NULL UNIQUE,
  options      JSONB NOT NULL            -- [{ "label": "...", "points": 1 }, ...]
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers       JSONB NOT NULL,
  score         INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  risk_profile  VARCHAR(12) NOT NULL CHECK (risk_profile IN
                  ('Conservative','Moderate','Balanced','Growth','Aggressive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_user ON risk_assessments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS model_portfolios (
  id                   SERIAL PRIMARY KEY,
  risk_profile         VARCHAR(12) NOT NULL UNIQUE CHECK (risk_profile IN
                         ('Conservative','Moderate','Balanced','Growth','Aggressive')),
  name                 VARCHAR(120) NOT NULL,
  equities_pct         NUMERIC(5,2) NOT NULL CHECK (equities_pct >= 0),
  fixed_income_pct     NUMERIC(5,2) NOT NULL CHECK (fixed_income_pct >= 0),
  sukuk_pct            NUMERIC(5,2) NOT NULL CHECK (sukuk_pct >= 0),
  gold_pct             NUMERIC(5,2) NOT NULL CHECK (gold_pct >= 0),
  real_estate_pct      NUMERIC(5,2) NOT NULL CHECK (real_estate_pct >= 0),
  cash_pct             NUMERIC(5,2) NOT NULL CHECK (cash_pct >= 0),
  expected_return_min  NUMERIC(5,2) NOT NULL,
  expected_return_max  NUMERIC(5,2) NOT NULL,
  description          TEXT NOT NULL,
  CONSTRAINT allocation_totals_100 CHECK (
    equities_pct + fixed_income_pct + sukuk_pct + gold_pct + real_estate_pct + cash_pct = 100
  )
);

CREATE TABLE IF NOT EXISTS retirement_plans (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current_age             INTEGER NOT NULL,
  retirement_age          INTEGER NOT NULL,
  current_savings         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (current_savings >= 0),
  monthly_contribution    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_contribution >= 0),
  expected_return_pct     NUMERIC(5,2) NOT NULL,
  desired_monthly_income  NUMERIC(14,2) NOT NULL CHECK (desired_monthly_income >= 0),
  -- Planning assumptions shown on the Retirement page
  retirement_years        INTEGER NOT NULL DEFAULT 25 CHECK (retirement_years BETWEEN 5 AND 45),
  inflation_pct           NUMERIC(5,2) NOT NULL DEFAULT 2.5 CHECK (inflation_pct BETWEEN 0 AND 10),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Age and return limits are (re)applied here so existing databases pick up changes.
ALTER TABLE retirement_plans DROP CONSTRAINT IF EXISTS retirement_plans_current_age_check;
ALTER TABLE retirement_plans ADD CONSTRAINT retirement_plans_current_age_check CHECK (current_age BETWEEN 18 AND 100);
ALTER TABLE retirement_plans DROP CONSTRAINT IF EXISTS retirement_plans_retirement_age_check;
ALTER TABLE retirement_plans ADD CONSTRAINT retirement_plans_retirement_age_check CHECK (retirement_age BETWEEN 18 AND 100);
ALTER TABLE retirement_plans DROP CONSTRAINT IF EXISTS retirement_plans_check;
ALTER TABLE retirement_plans DROP CONSTRAINT IF EXISTS retirement_plans_ages_order_check;
ALTER TABLE retirement_plans ADD CONSTRAINT retirement_plans_ages_order_check CHECK (retirement_age > current_age);
ALTER TABLE retirement_plans DROP CONSTRAINT IF EXISTS retirement_plans_expected_return_pct_check;
ALTER TABLE retirement_plans ADD CONSTRAINT retirement_plans_expected_return_pct_check CHECK (expected_return_pct BETWEEN 0 AND 20);

CREATE TABLE IF NOT EXISTS saved_calculations (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calculator_type  VARCHAR(40) NOT NULL,
  inputs           JSONB NOT NULL,
  result           JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_calculations_user ON saved_calculations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS services (
  id                 SERIAL PRIMARY KEY,
  name               VARCHAR(120) NOT NULL UNIQUE,
  short_description  TEXT NOT NULL,
  details            TEXT NOT NULL,      -- one deliverable per line
  starting_price     NUMERIC(14,2) NOT NULL CHECK (starting_price >= 0),
  duration_minutes   INTEGER NOT NULL CHECK (duration_minutes > 0),
  order_index        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS insights (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  slug          VARCHAR(200) NOT NULL UNIQUE,
  category      VARCHAR(60) NOT NULL,
  summary       TEXT NOT NULL,
  body          TEXT NOT NULL,           -- simple HTML (paragraphs, headings, lists)
  author        VARCHAR(120) NOT NULL,
  read_minutes  INTEGER NOT NULL CHECK (read_minutes > 0),
  image_url     TEXT,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insights_published ON insights(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_category ON insights(category);

CREATE TABLE IF NOT EXISTS consultation_requests (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  phone           VARCHAR(30),
  service_id      INTEGER REFERENCES services(id) ON DELETE SET NULL,
  preferred_date  DATE,
  message         TEXT,
  status          VARCHAR(10) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','booked','closed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultations_user ON consultation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_service ON consultation_requests(service_id);
