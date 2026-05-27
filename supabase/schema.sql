-- TaxVault Supabase Schema
-- Create at: supabase.com → New Project → Name: "taxvault"
-- Run in SQL Editor

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('income','expense','asset')),
  category TEXT NOT NULL,
  domain TEXT CHECK (domain IN ('UDAS','LAUW','REBUILD','PERSONAL')),
  deductible BOOLEAN DEFAULT true,
  irc_code TEXT,
  receipt_url TEXT,
  source TEXT DEFAULT 'manual',
  fiscal_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax summaries (auto-calculated)
CREATE TABLE IF NOT EXISTS tax_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  fiscal_year INTEGER NOT NULL,
  gross_revenue DECIMAL(12,2) DEFAULT 0,
  total_deductions DECIMAL(12,2) DEFAULT 0,
  net_taxable DECIMAL(12,2) DEFAULT 0,
  se_tax_estimate DECIMAL(12,2) DEFAULT 0,
  income_tax_estimate DECIMAL(12,2) DEFAULT 0,
  total_estimate DECIMAL(12,2) DEFAULT 0,
  quarterly_payment DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fiscal_year)
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  purchase_date DATE,
  depreciation_method TEXT DEFAULT 'Section 179',
  business_use_pct INTEGER DEFAULT 100,
  year_1_deduction DECIMAL(12,2) DEFAULT 0,
  fiscal_year INTEGER DEFAULT 2026,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FBAR accounts
CREATE TABLE IF NOT EXISTS fbar_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  account_name TEXT,
  country TEXT DEFAULT 'Dominican Republic',
  highest_balance DECIMAL(12,2) DEFAULT 0,
  year_end_balance DECIMAL(12,2) DEFAULT 0,
  fiscal_year INTEGER DEFAULT 2026,
  fbar_required BOOLEAN GENERATED ALWAYS AS (highest_balance > 10000) STORED,
  fatca_required BOOLEAN GENERATED ALWAYS AS (year_end_balance > 200000) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fbar_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own data" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON tax_summaries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data" ON fbar_accounts FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tx_user_year ON transactions(user_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_summary_user_year ON tax_summaries(user_id, fiscal_year);
