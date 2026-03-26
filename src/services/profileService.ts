import { supabase } from '../lib/supabase';
import { Profile, TaskCompletion, TaskGroup } from '../lib/types';

export const profileService = {
  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile> {
    console.log('[ProfileService] Updating profile:', userId, updates);

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[ProfileService] Error updating profile:', error);
      throw new Error(error.message);
    }

    console.log('[ProfileService] Profile updated successfully');
    return data;
  },

  async fetchTaskHistory(
    userId: string,
    limit: number = 10
  ): Promise<(TaskCompletion & { task_group: TaskGroup })[]> {
    console.log('[ProfileService] Fetching task history for user:', userId, 'limit:', limit);

    const { data } = await supabase
      .from('task_completions')
      .select('*, task_groups(*)')
      .eq('user_id', userId)
      .order('completion_date', { ascending: false })
      .limit(limit);

    if (!data) {
      console.log('[ProfileService] No task history found');
      return [];
    }

    const history = data.map((item: any) => ({
      ...item,
      task_group: item.task_groups,
    }));

    console.log('[ProfileService] Fetched task history:', history.length);
    return history;
  },

  async updateXP(userId: string, currentXP: number, xpChange: number): Promise<number> {
    console.log('[ProfileService] Updating XP:', userId, 'current:', currentXP, 'change:', xpChange);

    const newXP = currentXP + xpChange;

    const { error } = await supabase
      .from('profiles')
      .update({
        xp: newXP,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('[ProfileService] Error updating XP:', error);
      throw new Error(error.message);
    }

    console.log('[ProfileService] XP updated successfully to:', newXP);
    return newXP;
  },
};
