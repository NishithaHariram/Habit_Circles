import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TaskGroup, GroupMember, TaskCompletion } from '../../lib/types';
import { CheckCircle2, Circle, TrendingUp, Target, Award, AlertCircle, Loader2 } from 'lucide-react';

export function Dashboard() {
  const { profile, setProfile } = useAuth();
  const [myGroups, setMyGroups] = useState<(TaskGroup & { member?: GroupMember; completion?: TaskCompletion })[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyGroups();
  }, [profile]);

  const fetchMyGroups = async () => {
    if (!profile) return;

    const { data: memberData } = await supabase
      .from('group_members')
      .select('*, task_groups(*)')
      .eq('user_id', profile.id);

    if (memberData) {
      const today = new Date().toISOString().split('T')[0];

      const groupsWithCompletion = await Promise.all(
        memberData.map(async (member: any) => {
          const { data: completion } = await supabase
            .from('task_completions')
            .select('*')
            .eq('user_id', profile.id)
            .eq('group_id', member.task_groups.id)
            .eq('completion_date', today)
            .maybeSingle();

          return {
            ...member.task_groups,
            member: member,
            completion: completion || undefined,
          };
        })
      );

      setMyGroups(groupsWithCompletion);
    }
    setLoading(false);
  };

  const completeTask = async (groupId: string, durationMinutes: number, taskName: string) => {
    console.log('=== Mark as Done Clicked ===');
    console.log('Task ID:', groupId);
    console.log('Task Name:', taskName);
    console.log('Duration (minutes):', durationMinutes);

    if (!profile) {
      console.error('No profile found');
      setError('Please log in to complete tasks');
      return;
    }

    if (completingTasks.has(groupId)) {
      console.log('Task already being completed, ignoring duplicate click');
      return;
    }

    setCompletingTasks(prev => new Set(prev).add(groupId));
    setError('');
    setSuccessMessage('');

    const xpEarned = Math.floor(durationMinutes / 5);
    console.log('XP to be earned:', xpEarned, '(1 XP per 5 minutes)');

    const today = new Date().toISOString().split('T')[0];
    console.log('Completion date:', today);

    try {
      console.log('Checking for existing completion today...');
      const { data: existingCompletion } = await supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('group_id', groupId)
        .eq('completion_date', today)
        .maybeSingle();

      if (existingCompletion) {
        console.warn('Task already completed today!');
        setError('You already completed this task today!');
        setCompletingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(groupId);
          return newSet;
        });
        return;
      }

      console.log('Inserting task completion...');
      const { data: completionData, error: completionError } = await supabase
        .from('task_completions')
        .insert({
          user_id: profile.id,
          group_id: groupId,
          completion_date: today,
          xp_earned: xpEarned,
        })
        .select()
        .single();

      if (completionError) {
        console.error('Error inserting task completion:', completionError);
        throw new Error(completionError.message);
      }

      console.log('Task completion inserted successfully:', completionData);

      const newXP = profile.xp + xpEarned;
      const newTasksCompleted = profile.tasks_completed + 1;

      console.log('Updating profile...');
      console.log('Old XP:', profile.xp, '→ New XP:', newXP);
      console.log('Old tasks completed:', profile.tasks_completed, '→ New:', newTasksCompleted);

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          xp: newXP,
          tasks_completed: newTasksCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error(profileError.message);
      }

      console.log('Profile updated successfully:', updatedProfile);

      if (setProfile) {
        setProfile(updatedProfile);
        console.log('Profile state updated in AuthContext');
      }

      console.log('Refreshing groups list...');
      await fetchMyGroups();

      setSuccessMessage(`Task completed! +${xpEarned} XP earned!`);
      console.log('✅ Task completion successful!');

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (err: any) {
      console.error('Error completing task:', err);
      setError(err.message || 'Failed to complete task. Please try again.');
    } finally {
      setCompletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
      console.log('=== Task Completion Process Ended ===');
    }
  };

  const completedToday = myGroups.filter(g => g.completion).length;
  const totalActive = myGroups.length;
  const completionRate = totalActive > 0 ? Math.round((completedToday / totalActive) * 100) : 0;

  if (loading) {
    return <div className="p-8 text-center text-gray-600 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-lg text-sm mb-6 flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Active Tasks</p>
              <p className="text-3xl font-bold">{totalActive}</p>
            </div>
            <Target className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Completed Today</p>
              <p className="text-3xl font-bold">{completedToday}</p>
            </div>
            <CheckCircle2 className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Completion Rate</p>
              <p className="text-3xl font-bold">{completionRate}%</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-1">Excuses Left</p>
              <p className="text-3xl font-bold">{4 - (profile?.excuse_requests_this_month || 0)}</p>
            </div>
            <Award className="w-12 h-12 opacity-80" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Today's Tasks</h2>

        {myGroups.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No active task groups. Join or create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myGroups.map((group) => {
              const isCompleting = completingTasks.has(group.id);
              const isCompleted = !!group.completion;

              return (
                <div
                  key={group.id}
                  className={`border rounded-lg p-5 transition-all duration-300 ${
                    isCompleted
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {isCompleted ? (
                        <div className="animate-bounce">
                          <CheckCircle2 className="w-10 h-10 text-green-500 flex-shrink-0" />
                        </div>
                      ) : (
                        <Circle className="w-10 h-10 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className={`font-semibold text-lg ${
                          isCompleted
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {group.task_name}
                        </h3>
                        <p className={`text-sm ${
                          isCompleted
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {group.duration_minutes} minutes • Streak: {group.group_streak} days
                        </p>
                        {isCompleted && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                            Completed Today ✓
                          </p>
                        )}
                      </div>
                    </div>
                    {!isCompleted && (
                      <button
                        onClick={() => completeTask(group.id, group.duration_minutes, group.task_name)}
                        disabled={isCompleting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all font-medium flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        {isCompleting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark as Done</span>
                          </>
                        )}
                      </button>
                    )}
                    {isCompleted && (
                      <div className="text-right">
                        <span className="inline-flex items-center space-x-1 text-green-600 dark:text-green-400 font-bold text-lg">
                          <Award className="w-5 h-5" />
                          <span>+{group.completion.xp_earned} XP</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
