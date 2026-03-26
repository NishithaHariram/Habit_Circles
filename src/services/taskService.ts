import { supabase } from '../lib/supabase';
import { TaskGroup, GroupMember, TaskCompletion, Profile } from '../lib/types';

export const taskService = {
  async fetchMyGroups(userId: string): Promise<(TaskGroup & { member?: GroupMember; completion?: TaskCompletion })[]> {
    console.log('[TaskService] Fetching my groups for user:', userId);

    const today = new Date().toISOString().split('T')[0];

    const { data: memberData } = await supabase
      .from('group_members')
      .select(`
        *,
        task_groups (*)
      `)
      .eq('user_id', userId);

    if (!memberData) {
      console.log('[TaskService] No member data found');
      return [];
    }

    const groups = memberData.map((m: any) => ({
      ...m.task_groups,
      member: {
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        role: m.role,
        consecutive_misses: m.consecutive_misses,
        joined_at: m.joined_at,
        user_streak: m.user_streak,
        last_completed_date: m.last_completed_date,
      },
    }));

    const groupIds = groups.map(g => g.id);
    if (groupIds.length === 0) {
      console.log('[TaskService] No groups found');
      return [];
    }

    const { data: completions } = await supabase
      .from('task_completions')
      .select('*')
      .in('group_id', groupIds)
      .eq('user_id', userId)
      .eq('completion_date', today);

    const completionMap = new Map(
      completions?.map(c => [c.group_id, c]) || []
    );

    const groupsWithCompletion = groups.map(group => ({
      ...group,
      completion: completionMap.get(group.id),
    }));

    console.log('[TaskService] Fetched groups:', groupsWithCompletion.length);
    return groupsWithCompletion;
  },

  async fetchPublicGroups(): Promise<TaskGroup[]> {
    console.log('[TaskService] Fetching public groups');

    const { data } = await supabase
      .from('task_groups')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    console.log('[TaskService] Fetched public groups:', data?.length || 0);
    return data || [];
  },

  async fetchMyGroupIds(userId: string): Promise<Set<string>> {
    console.log('[TaskService] Fetching my group IDs for user:', userId);

    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    const ids = new Set(data?.map(m => m.group_id) || []);
    console.log('[TaskService] Fetched group IDs:', ids.size);
    return ids;
  },

  async joinGroup(groupId: string, userId: string): Promise<void> {
    console.log('[TaskService] Joining group:', groupId, 'for user:', userId);

    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      console.log('[TaskService] User is already a member, skipping insert');
      return;
    }

    const { error: insertError } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: 'member',
        consecutive_misses: 0,
        user_streak: 0,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        console.log('[TaskService] Duplicate insert detected (race condition), user already a member');
        return;
      }
      console.error('[TaskService] Error joining group:', insertError);
      throw new Error(insertError.message);
    }

    const { data: verifyMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (verifyMember) {
      const { data: groupData } = await supabase
        .from('task_groups')
        .select('current_members')
        .eq('id', groupId)
        .maybeSingle();

      if (groupData) {
        await supabase
          .from('task_groups')
          .update({ current_members: groupData.current_members + 1 })
          .eq('id', groupId);
      }
    }

    console.log('[TaskService] Successfully joined group');
  },

  async completeTask(
    groupId: string,
    userId: string,
    durationMinutes: number,
    taskName: string,
    currentProfile: Profile
  ): Promise<{ newXP: number; newTasksCompleted: number; newStreak: number }> {
    console.log('[TaskService] Completing task:', { groupId, userId, durationMinutes, taskName });

    const today = new Date().toISOString().split('T')[0];
    const xpEarned = durationMinutes * 10;

    const { data: existingCompletion } = await supabase
      .from('task_completions')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('completion_date', today)
      .maybeSingle();

    if (existingCompletion) {
      console.log('[TaskService] Task already completed today');
      throw new Error('Task already completed today');
    }

    const { data: completionData, error: completionError } = await supabase
      .from('task_completions')
      .insert({
        user_id: userId,
        group_id: groupId,
        completion_date: today,
        xp_earned: xpEarned,
        notes: `Completed ${taskName}`,
      })
      .select()
      .single();

    if (completionError) {
      console.error('[TaskService] Error inserting task completion:', completionError);
      throw new Error(completionError.message);
    }

    console.log('[TaskService] Task completion inserted:', completionData);

    const { data: memberData } = await supabase
      .from('group_members')
      .select('user_streak, last_completed_date')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    let newStreak = 1;
    if (memberData) {
      const lastCompleted = memberData.last_completed_date;
      console.log('[TaskService] Last completed date:', lastCompleted);

      if (lastCompleted) {
        const lastDate = new Date(lastCompleted);
        const todayDate = new Date(today);
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        console.log('[TaskService] Days since last completion:', diffDays);

        if (diffDays === 1) {
          newStreak = memberData.user_streak + 1;
          console.log('[TaskService] Consecutive day! Increasing streak to:', newStreak);
        } else if (diffDays > 1) {
          newStreak = 1;
          console.log('[TaskService] Streak broken! Resetting to 1');
        } else {
          newStreak = memberData.user_streak;
          console.log('[TaskService] Same day completion, maintaining streak:', newStreak);
        }
      } else {
        console.log('[TaskService] First completion! Starting streak at 1');
      }
    }

    const { error: streakError } = await supabase
      .from('group_members')
      .update({
        user_streak: newStreak,
        last_completed_date: today,
      })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (streakError) {
      console.error('[TaskService] Error updating streak:', streakError);
    } else {
      console.log('[TaskService] Streak updated successfully! New streak:', newStreak);
    }

    const newXP = currentProfile.xp + xpEarned;
    const newTasksCompleted = currentProfile.tasks_completed + 1;

    console.log('[TaskService] Updating profile XP:', currentProfile.xp, '→', newXP);
    console.log('[TaskService] Updating tasks completed:', currentProfile.tasks_completed, '→', newTasksCompleted);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        xp: newXP,
        tasks_completed: newTasksCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      console.error('[TaskService] Error updating profile:', profileError);
      throw new Error(profileError.message);
    }

    console.log('[TaskService] Profile updated successfully');

    return { newXP, newTasksCompleted, newStreak };
  },

  async createGroup(
    creatorId: string,
    taskName: string,
    description: string,
    durationMinutes: number,
    isPublic: boolean,
    maxMembers: number,
    repeatDays: boolean[]
  ): Promise<TaskGroup> {
    console.log('[TaskService] Creating group:', { taskName, isPublic, maxMembers });

    const inviteCode = isPublic ? undefined : Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data: group, error: groupError } = await supabase
      .from('task_groups')
      .insert({
        creator_id: creatorId,
        task_name: taskName,
        description: description || null,
        duration_minutes: durationMinutes,
        is_public: isPublic,
        invite_code: inviteCode,
        max_members: maxMembers,
        current_members: 1,
        repeat_days: repeatDays,
        group_streak: 0,
      })
      .select()
      .single();

    if (groupError) {
      console.error('[TaskService] Error creating group:', groupError);
      throw new Error(groupError.message);
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: creatorId,
        role: 'creator',
        consecutive_misses: 0,
        user_streak: 0,
      });

    if (memberError) {
      console.error('[TaskService] Error adding creator as member:', memberError);
      throw new Error(memberError.message);
    }

    console.log('[TaskService] Group created successfully:', group.id);
    return group;
  },
};
