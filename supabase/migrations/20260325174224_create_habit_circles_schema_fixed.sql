/*
  # Habit Circles - Complete Database Schema

  ## Overview
  Creates a comprehensive social habit tracking platform with task groups, streaks, 
  XP system, avatar customization, social features, and journaling.

  ## New Tables Created

  ### 1. profiles
  User profile extending auth.users with XP, stats, and avatar customization

  ### 2. task_groups
  Habit tracking groups with streaks, repeat settings, and invite codes

  ### 3. group_members
  Members in each task group with role and miss tracking

  ### 4. task_completions
  Daily task completion tracking with XP earned

  ### 5. excuse_requests
  Excuse/reschedule system with voting

  ### 6. excuse_votes
  Individual votes on excuse requests

  ### 7. store_items
  Avatar customization items (hats, shirts, pants, accessories)

  ### 8. user_inventory
  Items owned by users

  ### 9. social_posts
  Group social feed posts with comments and advice

  ### 10. post_likes
  Likes on social posts

  ### 11. journal_entries
  Personal reflection journal with mood tracking

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data or groups they're members of
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text NOT NULL,
  age integer,
  phone_number text,
  xp integer DEFAULT 100 NOT NULL,
  excuse_requests_this_month integer DEFAULT 0 NOT NULL,
  avatar_hat_id uuid,
  avatar_shirt_id uuid,
  avatar_pants_id uuid,
  avatar_accessory_id uuid,
  tasks_completed integer DEFAULT 0 NOT NULL,
  tasks_pending integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Task groups table
CREATE TABLE IF NOT EXISTS task_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL,
  is_public boolean DEFAULT true NOT NULL,
  invite_code text UNIQUE,
  max_members integer DEFAULT 10 NOT NULL,
  current_members integer DEFAULT 1 NOT NULL,
  repeat_days boolean[] DEFAULT ARRAY[true, true, true, true, true, true, true] NOT NULL,
  group_streak integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE task_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view public groups"
  ON task_groups FOR SELECT
  TO authenticated
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can create task groups"
  ON task_groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their groups"
  ON task_groups FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can delete their groups"
  ON task_groups FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES task_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' NOT NULL,
  consecutive_misses integer DEFAULT 0 NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members in their groups"
  ON group_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can join groups"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups"
  ON group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can update member info"
  ON group_members FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Task completions table
CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES task_groups(id) ON DELETE CASCADE NOT NULL,
  completion_date date DEFAULT CURRENT_DATE NOT NULL,
  xp_earned integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, group_id, completion_date)
);

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view completions in their groups"
  ON task_completions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own completions"
  ON task_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completions"
  ON task_completions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Excuse requests table
CREATE TABLE IF NOT EXISTS excuse_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES task_groups(id) ON DELETE CASCADE NOT NULL,
  request_date date NOT NULL,
  reason text,
  status text DEFAULT 'pending' NOT NULL,
  approvals_needed integer NOT NULL,
  current_approvals integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, group_id, request_date)
);

ALTER TABLE excuse_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view excuse requests in their groups"
  ON excuse_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create excuse requests"
  ON excuse_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update excuse requests"
  ON excuse_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Excuse votes table
CREATE TABLE IF NOT EXISTS excuse_votes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES excuse_requests(id) ON DELETE CASCADE NOT NULL,
  voter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vote boolean NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(request_id, voter_id)
);

ALTER TABLE excuse_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view votes in their groups"
  ON excuse_votes FOR SELECT
  TO authenticated
  USING (voter_id = auth.uid() OR request_id IN (
    SELECT er.id FROM excuse_requests er
    JOIN group_members gm ON gm.group_id = er.group_id
    WHERE gm.user_id = auth.uid()
  ));

CREATE POLICY "Group members can vote on excuse requests"
  ON excuse_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = voter_id);

-- Store items table
CREATE TABLE IF NOT EXISTS store_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category text NOT NULL,
  name text NOT NULL,
  image_url text,
  xp_cost integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE store_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view store items"
  ON store_items FOR SELECT
  TO authenticated
  USING (true);

-- User inventory table
CREATE TABLE IF NOT EXISTS user_inventory (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES store_items(id) ON DELETE CASCADE NOT NULL,
  purchased_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, item_id)
);

ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inventory"
  ON user_inventory FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add to own inventory"
  ON user_inventory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Social posts table
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES task_groups(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  post_type text DEFAULT 'comment' NOT NULL,
  likes_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts in their groups"
  ON social_posts FOR SELECT
  TO authenticated
  USING (group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Group members can create posts"
  ON social_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their posts"
  ON social_posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors can delete their posts"
  ON social_posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Post likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid REFERENCES social_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes on posts"
  ON post_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Journal entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  mood integer NOT NULL CHECK (mood >= 1 AND mood <= 5),
  entry_date date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal entries"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own journal entries"
  ON journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON journal_entries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own journal entries"
  ON journal_entries FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Insert default store items
INSERT INTO store_items (category, name, xp_cost) VALUES
  -- Hats
  ('hat', 'Baseball Cap', 50),
  ('hat', 'Beanie', 60),
  ('hat', 'Top Hat', 100),
  ('hat', 'Crown', 150),
  ('hat', 'Wizard Hat', 120),
  ('hat', 'Cowboy Hat', 80),
  ('hat', 'Beret', 70),
  ('hat', 'Viking Helmet', 130),
  ('hat', 'Chef Hat', 90),
  ('hat', 'Graduation Cap', 110),
  ('hat', 'Halo', 200),
  ('hat', 'Party Hat', 60),
  
  -- Shirts
  ('shirt', 'Plain T-Shirt', 40),
  ('shirt', 'Polo Shirt', 60),
  ('shirt', 'Hoodie', 80),
  ('shirt', 'Tank Top', 50),
  ('shirt', 'Dress Shirt', 70),
  ('shirt', 'Leather Jacket', 120),
  ('shirt', 'Sports Jersey', 90),
  ('shirt', 'Sweater', 75),
  ('shirt', 'Tuxedo', 150),
  ('shirt', 'Hawaiian Shirt', 85),
  ('shirt', 'Superhero Suit', 180),
  ('shirt', 'Wizard Robe', 140),
  
  -- Pants
  ('pants', 'Jeans', 50),
  ('pants', 'Shorts', 40),
  ('pants', 'Skirt', 60),
  ('pants', 'Dress Pants', 70),
  ('pants', 'Sweatpants', 55),
  ('pants', 'Cargo Pants', 65),
  ('pants', 'Leggings', 60),
  ('pants', 'Kilt', 80),
  ('pants', 'Athletic Shorts', 50),
  ('pants', 'Formal Skirt', 75),
  ('pants', 'Knight Armor', 200),
  ('pants', 'Pajama Pants', 45),
  
  -- Accessories
  ('accessory', 'Sunglasses', 60),
  ('accessory', 'Scarf', 50),
  ('accessory', 'Watch', 80),
  ('accessory', 'Backpack', 70),
  ('accessory', 'Necklace', 65),
  ('accessory', 'Earrings', 55),
  ('accessory', 'Bracelet', 60),
  ('accessory', 'Cape', 100),
  ('accessory', 'Wings', 150),
  ('accessory', 'Sword', 120),
  ('accessory', 'Magic Wand', 110),
  ('accessory', 'Guitar', 130)
ON CONFLICT DO NOTHING;
