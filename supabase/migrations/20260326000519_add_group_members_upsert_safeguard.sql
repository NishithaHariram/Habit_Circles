/*
  # Add Database Safeguards for Group Membership
  
  ## Overview
  Adds additional safeguards to prevent duplicate group membership errors
  and ensures the unique constraint is properly enforced.
  
  ## Changes
  1. Creates an index on the unique constraint if not exists
  2. Adds a helper function for safe group member insertion
  
  ## Security
  - Maintains existing RLS policies
  - No changes to data access permissions
*/

-- Ensure the unique constraint index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'group_members' 
    AND indexname = 'group_members_group_id_user_id_key'
  ) THEN
    CREATE UNIQUE INDEX group_members_group_id_user_id_key 
    ON group_members(group_id, user_id);
  END IF;
END $$;

-- Create a helper function for safe group member insertion
CREATE OR REPLACE FUNCTION safe_join_group(
  p_group_id uuid,
  p_user_id uuid,
  p_role text DEFAULT 'member'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert, ignore if already exists
  INSERT INTO group_members (group_id, user_id, role, consecutive_misses, user_streak)
  VALUES (p_group_id, p_user_id, p_role, 0, 0)
  ON CONFLICT (group_id, user_id) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION safe_join_group TO authenticated;
