-- Schema for API Breaking-Change Guardian

CREATE TABLE IF NOT EXISTS repos (
  id TEXT PRIMARY KEY,
  github_installation_id BIGINT NOT NULL,
  repo_full_name TEXT NOT NULL,
  user_id TEXT,
  last_indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_sites (
  id TEXT PRIMARY KEY,
  repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  line_number INT NOT NULL,
  stripe_symbol TEXT NOT NULL,
  snippet TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS changelog_entries (
  id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  raw_text TEXT NOT NULL,
  change_type TEXT NOT NULL, -- 'deprecation' | 'removal' | 'signature_change'
  affected_symbol TEXT NOT NULL,
  is_breaking BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_changelog_entry UNIQUE (source_url, affected_symbol, change_type)
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  changelog_entry_id TEXT NOT NULL REFERENCES changelog_entries(id) ON DELETE CASCADE,
  call_site_id TEXT NOT NULL REFERENCES call_sites(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'fix_generated' | 'pr_opened' | 'resolved' | 'dismissed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_match UNIQUE (changelog_entry_id, call_site_id)
);

CREATE TABLE IF NOT EXISTS fixes (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  generated_diff TEXT NOT NULL,
  pr_url TEXT,
  pr_status TEXT DEFAULT 'open', -- 'open' | 'merged' | 'closed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GitHub App installations are the only long-lived GitHub credential reference.
CREATE TABLE IF NOT EXISTS github_installations (
  installation_id BIGINT PRIMARY KEY,
  user_id TEXT,
  account_login TEXT,
  account_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for rapid queries
CREATE INDEX IF NOT EXISTS idx_call_sites_symbol ON call_sites(stripe_symbol);
CREATE INDEX IF NOT EXISTS idx_call_sites_repo ON call_sites(repo_id);
CREATE INDEX IF NOT EXISTS idx_changelog_symbol ON changelog_entries(affected_symbol);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Migrations
ALTER TABLE repos ADD COLUMN IF NOT EXISTS user_id TEXT;
