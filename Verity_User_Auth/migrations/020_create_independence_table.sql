-- Migration: Create independence table
-- Date: 2026-01-28
-- Description: Create independence table with user_id and submitted (list column)

-- Create independence table
CREATE TABLE IF NOT EXISTS independence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted JSONB DEFAULT '[]'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(user_id)
);

-- Add comment to table
COMMENT ON TABLE independence IS 'Tracks independence submissions for users';

-- Add comment to columns
COMMENT ON COLUMN independence.user_id IS 'Reference to user';
COMMENT ON COLUMN independence.submitted IS 'List of submitted items (JSON array)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_independence_user_id ON independence(user_id);

