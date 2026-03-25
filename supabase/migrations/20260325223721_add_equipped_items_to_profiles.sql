/*
  # Add Equipped Items to Profiles

  1. Changes
    - Add `equipped_shirt` column to profiles table (text, nullable)
    - Add `equipped_pants` column to profiles table (text, nullable)
    - Add `equipped_accessories` column to profiles table (JSONB array, nullable)
  
  2. Notes
    - These fields will store the IDs or names of equipped cosmetic items
    - equipped_accessories is JSONB to support multiple accessories
    - All fields are nullable (users start with default items)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'equipped_shirt'
  ) THEN
    ALTER TABLE profiles ADD COLUMN equipped_shirt text DEFAULT 'default';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'equipped_pants'
  ) THEN
    ALTER TABLE profiles ADD COLUMN equipped_pants text DEFAULT 'blue';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'equipped_accessories'
  ) THEN
    ALTER TABLE profiles ADD COLUMN equipped_accessories jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;