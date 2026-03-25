import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TaskGroup, GroupMember, TaskCompletion } from '../../lib/types';
import { CheckCircle2, Circle, TrendingUp, Target, Award, AlertCircle } from 'lucide-react';

export function Dashboard() {
  const { profile } = useAuth();
  const [myGroups, setMyGroups] = useState<(TaskGroup & { member?: GroupMember; completion?: TaskCompletion })[]>([]);
  const [loading, setLoading] = useState(true);

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

  const completeTask = async (groupId: string, durationMinutes: number) => {
    if (!profile) return;

    const xpEarned = Math.floor(durationMinutes / 5);
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('task_completions').insert({
      user_id: profile.id,
      group_id: groupId,
      completion_date: today,
      xp_earned: xpEarned,
    });

    if (!error) {
      await supabase
        .from('profiles')
        .update({
          xp: profile.xp + xpEarned,
          tasks_completed: profile.tasks_completed + 1
        })
        .eq('id', profile.id);

      fetchMyGroups();
      window.location.reload();
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
            {myGroups.map((group) => (
              <div
                key={group.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {group.completion ? (
                      <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-8 h-8 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{group.task_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {group.duration_minutes} minutes • Streak: {group.group_streak} days
                      </p>
                    </div>
                  </div>
                  {!group.completion && (
                    <button
                      onClick={() => completeTask(group.id, group.duration_minutes)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                    >
                      Complete
                    </button>
                  )}
                  {group.completion && (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      +{group.completion.xp_earned} XP
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
