-- TaxVault Schema — run in Supabase SQL Editor
-- Project: kiuisajvhjosksfjuxpr.supabase.co
-- ⚠ After running: Dashboard → Project Settings → API → Exposed Schemas → add "taxvault"

-- 1. Schema
CREATE SCHEMA IF NOT EXISTS taxvault;

-- 2. PostgREST access grants
GRANT USAGE  ON SCHEMA taxvault TO anon, authenticated, service_role;

-- 3. Tables

CREATE TABLE IF NOT EXISTS taxvault.transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  description  TEXT NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  type         TEXT CHECK (type IN ('income','expense','asset')),
  category     TEXT NOT NULL,
  domain       TEXT CHECK (domain IN ('UDAS','LAUW','REBUILD','PERSONAL')),
  deductible   BOOLEAN DEFAULT true,
  irc_code     TEXT,
  receipt_url  TEXT,
  source       TEXT DEFAULT 'manual',
  fiscal_year  INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taxvault.tax_summaries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id),
  fiscal_year          INTEGER NOT NULL,
  gross_revenue        DECIMAL(12,2) DEFAULT 0,
  total_deductions     DECIMAL(12,2) DEFAULT 0,
  net_taxable          DECIMAL(12,2) DEFAULT 0,
  se_tax_estimate      DECIMAL(12,2) DEFAULT 0,
  income_tax_estimate  DECIMAL(12,2) DEFAULT 0,
  total_estimate       DECIMAL(12,2) DEFAULT 0,
  quarterly_payment    DECIMAL(12,2) DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fiscal_year)
);

CREATE TABLE IF NOT EXISTS taxvault.assets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id),
  name                 TEXT NOT NULL,
  cost                 DECIMAL(12,2) NOT NULL,
  purchase_date        DATE,
  depreciation_method  TEXT DEFAULT 'Section 179',
  business_use_pct     INTEGER DEFAULT 100,
  year_1_deduction     DECIMAL(12,2) DEFAULT 0,
  fiscal_year          INTEGER DEFAULT 2026,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taxvault.fbar_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id),
  account_name     TEXT,
  country          TEXT DEFAULT 'Dominican Republic',
  highest_balance  DECIMAL(12,2) DEFAULT 0,
  year_end_balance DECIMAL(12,2) DEFAULT 0,
  fiscal_year      INTEGER DEFAULT 2026,
  fbar_required    BOOLEAN GENERATED ALWAYS AS (highest_balance > 10000) STORED,
  fatca_required   BOOLEAN GENERATED ALWAYS AS (year_end_balance > 200000) STORED,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table-level grants (RLS enforces row ownership; grants allow PostgREST to reach the tables)
GRANT ALL ON ALL TABLES    IN SCHEMA taxvault TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA taxvault TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA taxvault TO anon;

-- 5. Row Level Security
ALTER TABLE taxvault.transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxvault.tax_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxvault.assets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE taxvault.fbar_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own data" ON taxvault.transactions  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON taxvault.tax_summaries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON taxvault.assets        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON taxvault.fbar_accounts FOR ALL USING (auth.uid() = user_id);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_tv_tx_user_year     ON taxvault.transactions(user_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_tv_tx_type          ON taxvault.transactions(type);
CREATE INDEX IF NOT EXISTS idx_tv_summary_user_year ON taxvault.tax_summaries(user_id, fiscal_year);
