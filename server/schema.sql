-- ============================================================================
-- FINORA FINANCIAL ADVISORY - NEON POSTGRESQL RELATIONAL SCHEMA
-- ============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ADVISORS
CREATE TABLE IF NOT EXISTS advisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  phone VARCHAR(50),
  title VARCHAR(100) NOT NULL,
  bio TEXT,
  specialties TEXT[],
  photo_url VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS (Authentication credentials & core identity)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'advisor', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(120) NOT NULL,
  department VARCHAR(80),
  permissions TEXT[] DEFAULT ARRAY['all'],
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. CLIENT PROFILES
CREATE TABLE IF NOT EXISTS client_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  advisor_id UUID REFERENCES advisors(id) ON DELETE SET NULL,
  client_code VARCHAR(30) UNIQUE NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(80) DEFAULT 'United States',
  employment_status VARCHAR(60),
  household_stage VARCHAR(60),
  annual_income NUMERIC(15, 2) DEFAULT 0,
  net_worth_estimate NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. FINANCIAL ASSESSMENTS (Diagnostic health audits)
CREATE TABLE IF NOT EXISTS financial_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  overall_score INT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  cashflow_score INT NOT NULL CHECK (cashflow_score BETWEEN 0 AND 100),
  savings_score INT NOT NULL CHECK (savings_score BETWEEN 0 AND 100),
  emergency_score INT NOT NULL CHECK (emergency_score BETWEEN 0 AND 100),
  debt_score INT NOT NULL CHECK (debt_score BETWEEN 0 AND 100),
  investments_score INT NOT NULL CHECK (investments_score BETWEEN 0 AND 100),
  retirement_score INT NOT NULL CHECK (retirement_score BETWEEN 0 AND 100),
  protection_score INT NOT NULL CHECK (protection_score BETWEEN 0 AND 100),
  answers_json JSONB NOT NULL,
  advisor_observations TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. INCOME (Detailed cash flow line items)
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  category VARCHAR(60) NOT NULL, -- 'Salary', 'Business Distribution', 'Dividend/Interest', 'Rental', 'Other'
  source_name VARCHAR(120) NOT NULL,
  monthly_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  frequency VARCHAR(30) DEFAULT 'Monthly',
  is_taxable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. EXPENSES (Household expenditure line items)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  category VARCHAR(60) NOT NULL, -- 'Housing', 'Healthcare', 'Education', 'Lifestyle', 'Debt Service', 'Insurance'
  expense_name VARCHAR(120) NOT NULL,
  monthly_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_essential BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. ASSETS (Balance sheet itemization)
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  asset_type VARCHAR(60) NOT NULL, -- 'Cash & Reserves', 'Taxable Brokerage', 'Retirement / Pension', 'Real Estate', 'Private Equity', 'Other'
  asset_name VARCHAR(120) NOT NULL,
  current_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  institution VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. LIABILITIES (Balance sheet debts)
CREATE TABLE IF NOT EXISTS liabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  liability_type VARCHAR(60) NOT NULL, -- 'Mortgage', 'Personal Loan', 'Vehicle Financing', 'Credit Card', 'Business Line', 'Other'
  creditor_name VARCHAR(120) NOT NULL,
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  interest_rate NUMERIC(5, 2) DEFAULT 0,
  monthly_payment NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. FINANCIAL GOALS (Milestones)
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  goal_type VARCHAR(60) NOT NULL, -- 'Emergency Fund', 'Home Purchase', 'Education', 'Wedding', 'Travel', 'Investment', 'Retirement', 'Major Purchase', 'Other'
  goal_name VARCHAR(140) NOT NULL,
  target_amount NUMERIC(15, 2) NOT NULL,
  current_savings NUMERIC(15, 2) NOT NULL DEFAULT 0,
  target_date DATE NOT NULL,
  monthly_contribution NUMERIC(12, 2) NOT NULL DEFAULT 0,
  priority VARCHAR(30) DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  status VARCHAR(30) DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Completed', 'Paused', 'Review Needed')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. RISK ASSESSMENTS
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  risk_score INT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_profile VARCHAR(50) NOT NULL CHECK (risk_profile IN ('Conservative', 'Moderately Conservative', 'Balanced', 'Growth', 'Aggressive')),
  timeframe_score INT,
  loss_tolerance_score INT,
  capacity_score INT,
  answers_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. INVESTMENT PROFILES
CREATE TABLE IF NOT EXISTS investment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  risk_profile VARCHAR(50) NOT NULL,
  target_equity_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  target_fixed_income_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  target_alternatives_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  target_cash_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  time_horizon_years INT DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. RETIREMENT PLANS
CREATE TABLE IF NOT EXISTS retirement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  current_age INT NOT NULL,
  target_retirement_age INT NOT NULL,
  current_savings NUMERIC(15, 2) NOT NULL DEFAULT 0,
  monthly_contribution NUMERIC(12, 2) NOT NULL DEFAULT 0,
  expected_return_pct NUMERIC(5, 2) NOT NULL DEFAULT 6.0,
  inflation_pct NUMERIC(5, 2) NOT NULL DEFAULT 2.5,
  desired_annual_income NUMERIC(15, 2) NOT NULL,
  expected_retirement_duration INT DEFAULT 30,
  projected_fund NUMERIC(15, 2) NOT NULL DEFAULT 0,
  required_fund NUMERIC(15, 2) NOT NULL DEFAULT 0,
  funding_gap NUMERIC(15, 2) NOT NULL DEFAULT 0,
  suggested_monthly_contrib NUMERIC(12, 2) DEFAULT 0,
  readiness_status VARCHAR(50) DEFAULT 'On Track',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. CALCULATOR RESULTS (Saved snapshots of exploratory scenarios)
CREATE TABLE IF NOT EXISTS calculator_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES client_profiles(id) ON DELETE SET NULL,
  calculator_type VARCHAR(60) NOT NULL, -- 'Net Worth', 'Savings', 'Compound Growth', 'Mortgage', 'Education'
  inputs_json JSONB NOT NULL,
  outputs_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. ADVISOR CONSULTATION REQUESTS
CREATE TABLE IF NOT EXISTS advisor_consultation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(80) DEFAULT 'United States',
  preferred_contact_method VARCHAR(40) DEFAULT 'Email' CHECK (preferred_contact_method IN ('Email', 'Phone', 'Video Call', 'In-Person Salon')),
  area_of_interest VARCHAR(80) NOT NULL,
  preferred_date DATE,
  message TEXT,
  status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Contacted', 'Scheduled', 'Completed', 'Archived')),
  assigned_advisor_id UUID REFERENCES advisors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. CLIENT NOTES (Private advisor records & meeting summaries)
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  advisor_id UUID REFERENCES advisors(id) ON DELETE SET NULL,
  note_type VARCHAR(50) DEFAULT 'Discovery Summary',
  title VARCHAR(160) NOT NULL,
  content TEXT NOT NULL,
  is_confidential BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. DOCUMENTS (Vault files & plan dossiers)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  file_name VARCHAR(200) NOT NULL,
  file_type VARCHAR(60) NOT NULL,
  file_size_bytes BIGINT DEFAULT 0,
  storage_url VARCHAR(255) NOT NULL,
  category VARCHAR(60) DEFAULT 'Financial Plan',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 18. ACTIVITIES (Audit trail of client & advisor actions)
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  advisor_id UUID REFERENCES advisors(id) ON DELETE SET NULL,
  activity_type VARCHAR(60) NOT NULL,
  description TEXT NOT NULL,
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 19. SESSION TABLE (for express-session with connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_expire_idx CHECK ((expire IS NULL) OR (expire > CURRENT_TIMESTAMP))
);

-- 20. AUDIT LOGS (for security & compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(60) NOT NULL,
  resource_id VARCHAR(100),
  changes_json JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 21. ADVISOR CLIENTS (explicit assignment relationship)
CREATE TABLE IF NOT EXISTS advisor_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  relationship_status VARCHAR(50) DEFAULT 'Active' CHECK (relationship_status IN ('Active', 'Inactive', 'Reviewing')),
  assigned_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(advisor_id, client_id)
);

-- 22. ADVISOR PRIVATE NOTES
CREATE TABLE IF NOT EXISTS advisor_private_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_visible_to_client BOOLEAN DEFAULT FALSE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 23. ADVISOR TASKS (follow-up reminders)
CREATE TABLE IF NOT EXISTS advisor_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('Review', 'Document Request', 'Follow-up Call', 'Goal Review', 'Annual Review', 'Other')),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  priority VARCHAR(30) DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  status VARCHAR(30) DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Completed', 'Cancelled')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 24. CLIENT SCENARIOS (What-If analysis)
CREATE TABLE IF NOT EXISTS client_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  scenario_name VARCHAR(150) NOT NULL,
  scenario_type VARCHAR(60) NOT NULL, -- 'Savings Increase', 'Retirement Delay', 'Return Change', 'Inflation Change'
  assumptions_json JSONB NOT NULL,
  results_json JSONB NOT NULL,
  is_saved BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for optimal relational query performance
CREATE INDEX IF NOT EXISTS idx_client_profiles_advisor ON client_profiles(advisor_id);
CREATE INDEX IF NOT EXISTS idx_client_profiles_user ON client_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_assessments_client ON financial_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_client ON financial_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_assets_client ON assets(client_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_client ON liabilities(client_id);
CREATE INDEX IF NOT EXISTS idx_retirement_plans_client ON retirement_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_consultation_status ON advisor_consultation_requests(status);
CREATE INDEX IF NOT EXISTS idx_advisor_clients_advisor ON advisor_clients(advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_clients_client ON advisor_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_advisor_tasks_advisor ON advisor_tasks(advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_tasks_due_date ON advisor_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);
