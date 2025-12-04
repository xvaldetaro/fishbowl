-- Run this in Supabase SQL Editor to set up the tables

-- Create lobbies table
CREATE TABLE lobbies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  config_turn_time INTEGER NOT NULL DEFAULT 60,
  config_phrases_per_player INTEGER NOT NULL DEFAULT 3
);

-- Create submissions table
CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id UUID REFERENCES lobbies(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  phrases JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS for simplicity (this is a party game, no auth needed)
ALTER TABLE lobbies DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;

-- Or if you prefer RLS enabled with public access:
-- ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all" ON lobbies FOR ALL USING (true);
-- CREATE POLICY "Allow all" ON submissions FOR ALL USING (true);
