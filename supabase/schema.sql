-- GitNetwork Supabase Schema

-- Launched tokens
CREATE TABLE IF NOT EXISTS launches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_did text UNIQUE NOT NULL,
  repo_url text,
  repo_name text,
  token_address text NOT NULL,
  factory_address text NOT NULL,
  deployer_wallet text NOT NULL,
  token_name text,
  token_symbol text,
  total_supply numeric,
  chain_id integer DEFAULT 8453,
  tx_hash text,
  created_at timestamptz DEFAULT now()
);

-- Contributor vesting records
CREATE TABLE IF NOT EXISTS vestings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  launch_id uuid REFERENCES launches(id) ON DELETE CASCADE,
  contributor_wallet text NOT NULL,
  vesting_contract text NOT NULL,
  total_amount numeric,
  claimed_amount numeric DEFAULT 0,
  cliff_seconds integer,
  duration_seconds integer,
  start_timestamp timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Governance proposals
CREATE TABLE IF NOT EXISTS proposals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address text NOT NULL,
  proposal_id integer NOT NULL,
  description text,
  proposer text,
  votes_for numeric DEFAULT 0,
  votes_against numeric DEFAULT 0,
  status text DEFAULT 'active',
  ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(token_address, proposal_id)
);

-- DID verification sessions
CREATE TABLE IF NOT EXISTS did_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address text NOT NULL,
  repo_did text NOT NULL,
  challenge text NOT NULL,
  verified boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Webhook event log
CREATE TABLE IF NOT EXISTS pr_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  repo_did text NOT NULL,
  pr_id text,
  contributor_did text,
  contributor_wallet text,
  merged_at timestamptz,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_launches_repo_did ON launches(repo_did);
CREATE INDEX IF NOT EXISTS idx_launches_token_address ON launches(token_address);
CREATE INDEX IF NOT EXISTS idx_vestings_contributor ON vestings(contributor_wallet);
CREATE INDEX IF NOT EXISTS idx_vestings_launch_id ON vestings(launch_id);
CREATE INDEX IF NOT EXISTS idx_proposals_token ON proposals(token_address);
CREATE INDEX IF NOT EXISTS idx_did_sessions_wallet ON did_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_pr_events_repo_did ON pr_events(repo_did);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vestings_updated_at
  BEFORE UPDATE ON vestings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
