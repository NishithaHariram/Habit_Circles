export interface Profile {
  id: string;
  username: string;
  email: string;
  age?: number;
  phone_number?: string;
  xp: number;
  excuse_requests_this_month: number;
  avatar_hat_id?: string;
  avatar_shirt_id?: string;
  avatar_pants_id?: string;
  avatar_accessory_id?: string;
  equipped_shirt?: string;
  equipped_pants?: string;
  equipped_accessories?: string[];
  tasks_completed: number;
  tasks_pending: number;
  created_at: string;
  updated_at: string;
}

export interface TaskGroup {
  id: string;
  creator_id: string;
  task_name: string;
  description?: string;
  duration_minutes: number;
  is_public: boolean;
  invite_code?: string;
  max_members: number;
  current_members: number;
  repeat_days: boolean[];
  group_streak: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  consecutive_misses: number;
  joined_at: string;
}

export interface TaskCompletion {
  id: string;
  user_id: string;
  group_id: string;
  completion_date: string;
  xp_earned: number;
  notes?: string;
  created_at: string;
}

export interface ExcuseRequest {
  id: string;
  user_id: string;
  group_id: string;
  request_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvals_needed: number;
  current_approvals: number;
  created_at: string;
}

export interface ExcuseVote {
  id: string;
  request_id: string;
  voter_id: string;
  vote: boolean;
  created_at: string;
}

export interface StoreItem {
  id: string;
  category: 'hat' | 'shirt' | 'pants' | 'accessory';
  name: string;
  image_url?: string;
  xp_cost: number;
  created_at: string;
}

export interface UserInventory {
  id: string;
  user_id: string;
  item_id: string;
  purchased_at: string;
}

export interface SocialPost {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  post_type: string;
  likes_count: number;
  created_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  mood: 1 | 2 | 3 | 4 | 5;
  entry_date: string;
  created_at: string;
}
