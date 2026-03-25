/*
  # Fix Profiles Insert Policy

  ## Changes
  - Drop the existing restrictive insert policy on profiles table
  - Create a new policy that allows authenticated users to insert their own profile
  - Ensure the profile id matches the authenticated user id
  
  ## Security
  - Users can only insert a profile for themselves (id must match auth.uid())
  - Existing read and update policies remain unchanged
  - RLS remains enabled
*/

-- Drop the existing insert policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create new insert policy that allows users to create their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
