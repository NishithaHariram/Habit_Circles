/*
  # Fix Infinite Recursion in group_members RLS Policies

  ## Problem
  The SELECT policy on `group_members` queries `group_members` within itself,
  causing infinite recursion errors.

  ## Solution
  Replace the recursive policy with a simple, non-recursive approach:
  - Users can view group_members rows where they are the user
  - Users can view other members in public groups
  - This avoids querying group_members inside its own policy

  ## Changes
  1. Drop the recursive SELECT policy on group_members
  2. Create new non-recursive SELECT policy
  3. Keep other policies unchanged (INSERT, DELETE, UPDATE)
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view members in their groups" ON group_members;

-- Create new non-recursive SELECT policy
-- Users can view:
-- 1. Their own membership rows (user_id = auth.uid())
-- 2. Members in public groups
CREATE POLICY "Users can view group members non-recursive"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    group_id IN (
      SELECT id FROM task_groups WHERE is_public = true
    )
  );
