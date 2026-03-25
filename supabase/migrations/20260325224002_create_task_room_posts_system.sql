/*
  # Create Task Room Posts and Likes System

  1. New Tables
    - `task_room_posts`
      - `id` (uuid, primary key)
      - `group_id` (uuid, foreign key to task_groups)
      - `user_id` (uuid, foreign key to profiles)
      - `username` (text)
      - `message` (text)
      - `likes_count` (integer, default 0)
      - `created_at` (timestamptz)
    
    - `task_room_likes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to task_room_posts)
      - `user_id` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
      - Unique constraint on (post_id, user_id) to prevent duplicate likes

  2. Security
    - Enable RLS on both tables
    - Users can read all posts in groups they belong to
    - Users can create posts in groups they belong to
    - Users can like posts in groups they belong to
    - Users can delete their own posts
    - Users can unlike their own likes

  3. Indexes
    - Index on group_id for fast post retrieval
    - Index on post_id for fast like counting
*/

CREATE TABLE IF NOT EXISTS task_room_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES task_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  message text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_room_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES task_room_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_room_posts_group_id ON task_room_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_task_room_posts_created_at ON task_room_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_room_likes_post_id ON task_room_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_task_room_likes_user_id ON task_room_likes(user_id);

ALTER TABLE task_room_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_room_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view posts in their groups"
  ON task_room_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = task_room_posts.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create posts in their groups"
  ON task_room_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = task_room_posts.group_id
      AND group_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete their own posts"
  ON task_room_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view likes in their groups"
  ON task_room_likes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_room_posts
      JOIN group_members ON group_members.group_id = task_room_posts.group_id
      WHERE task_room_posts.id = task_room_likes.post_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can like posts in their groups"
  ON task_room_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_room_posts
      JOIN group_members ON group_members.group_id = task_room_posts.group_id
      WHERE task_room_posts.id = task_room_likes.post_id
      AND group_members.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can unlike their own likes"
  ON task_room_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE task_room_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE task_room_posts
    SET likes_count = likes_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_post_likes_count'
  ) THEN
    CREATE TRIGGER trigger_update_post_likes_count
    AFTER INSERT OR DELETE ON task_room_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_post_likes_count();
  END IF;
END $$;