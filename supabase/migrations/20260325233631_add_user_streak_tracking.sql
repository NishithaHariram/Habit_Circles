/*
  # Add User Streak Tracking to Group Members

  1. Changes
    - Add `user_streak` column to track each user's consecutive completion days
    - Add `last_completed_date` column to track the last day user completed the task
    
  2. Purpose
    - Enable individual streak tracking for users in each task group
    - Support streak badge display in the UI
    - Track last completion date to determine streak continuity
    
  3. Notes
    - user_streak: Number of consecutive days user has completed the task
    - last_completed_date: Last date user completed the task (null if never completed)
*/

-- Add user_streak column to group_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_members' AND column_name = 'user_streak'
  ) THEN
    ALTER TABLE group_members ADD COLUMN user_streak integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add last_completed_date column to group_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'group_members' AND column_name = 'last_completed_date'
  ) THEN
    ALTER TABLE group_members ADD COLUMN last_completed_date date;
  END IF;
END $$;