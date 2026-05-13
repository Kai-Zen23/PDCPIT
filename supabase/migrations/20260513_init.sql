-- Create matches table optimized for low-latency state projection
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  player_count INT NOT NULL DEFAULT 1,
  state JSONB NOT NULL
);

-- Indexing for fast queue fetching
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status) WHERE status = 'WAITING';
CREATE INDEX IF NOT EXISTS idx_matches_updated_at ON public.matches(updated_at);

-- Set up Row Level Security (RLS)
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access to match projections
CREATE POLICY "Allow public read access to matches"
  ON public.matches
  FOR SELECT
  USING (true);

-- Allow backend functions full control over records
-- Note: Service Role Key bypasses RLS inherently, but adding an explicit policy is best practice.
CREATE POLICY "Allow service role all access"
  ON public.matches
  USING (true)
  WITH CHECK (true);

-- Enable Realtime Broadcast for push state sync
-- This automatically streams JSONB modifications directly to authenticated/anonymous subscribers
DO $$
BEGIN
  -- Enable Realtime Broadcast for push state sync
  ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if the table is already added to the publication
END;
$$;
