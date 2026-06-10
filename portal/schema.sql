-- REALITECH Promotion — shared DB (Cloudflare D1)
-- Covers partner/affiliate accounts + referred customer leads + promo events (ads/showcase).

CREATE TABLE IF NOT EXISTS accounts (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,                 -- partner | affiliate | admin
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  company         TEXT,
  password_hash   TEXT NOT NULL,
  password_salt   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | active | suspended
  ref_code        TEXT UNIQUE,
  commission_rate REAL NOT NULL DEFAULT 0.05,     -- affiliate commission share (base 5%, up to 10%)
  discount_rate   REAL NOT NULL DEFAULT 0.0,      -- partner reseller discount (default 25%, up to 40%)
  notes           TEXT DEFAULT '',
  created_at      TEXT NOT NULL,
  approved_at     TEXT
);

CREATE TABLE IF NOT EXISTS referrals (
  id                TEXT PRIMARY KEY,
  account_id        TEXT,                         -- referring partner/affiliate (NULL = direct)
  business_name     TEXT NOT NULL,
  contact_name      TEXT,
  email             TEXT,
  phone             TEXT,
  role              TEXT,
  needs             TEXT,
  source            TEXT NOT NULL,                -- ads | partner | affiliate | showcase | direct
  utm               TEXT,
  stage             TEXT NOT NULL DEFAULT 'new',  -- new|contacted|qualified|proposal|won|lost
  deal_value        REAL NOT NULL DEFAULT 0,
  commission_amount REAL NOT NULL DEFAULT 0,
  notes             TEXT DEFAULT '',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payouts (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  period      TEXT,                               -- e.g. '2026-06'
  method      TEXT DEFAULT 'bank',                -- bank | momo | other
  note        TEXT DEFAULT '',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,                      -- ad_click | showcase_access | ...
  account_id  TEXT,
  source      TEXT,
  meta        TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ref_account ON referrals(account_id);
CREATE INDEX IF NOT EXISTS idx_ref_stage   ON referrals(stage);
CREATE INDEX IF NOT EXISTS idx_ref_source  ON referrals(source);
CREATE INDEX IF NOT EXISTS idx_acc_type    ON accounts(type, status);
CREATE INDEX IF NOT EXISTS idx_payout_acc  ON payouts(account_id);
