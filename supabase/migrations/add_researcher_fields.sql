-- Run this in Supabase SQL Editor

-- Add researcher profile fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS research_focus TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profile_slug TEXT UNIQUE;

-- Create researcher_works table
CREATE TABLE IF NOT EXISTS researcher_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('paper', 'tool', 'dataset')),
  title TEXT NOT NULL,
  journal TEXT,
  year INTEGER,
  url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on researcher_works
ALTER TABLE researcher_works ENABLE ROW LEVEL SECURITY;

-- Public profiles viewable by everyone (anon key included)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
CREATE POLICY "Public profiles are viewable by everyone" ON users
  FOR SELECT USING (is_public = true OR auth.uid() = id);

-- Users can update their own row
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Works readable when researcher is public or is the owner
DROP POLICY IF EXISTS "Works viewable when researcher is public" ON researcher_works;
CREATE POLICY "Works viewable when researcher is public" ON researcher_works
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = researcher_works.user_id
        AND users.is_public = true
    )
  );

-- Users can manage their own works
DROP POLICY IF EXISTS "Users can manage own works" ON researcher_works;
CREATE POLICY "Users can manage own works" ON researcher_works
  FOR ALL USING (auth.uid() = user_id);
