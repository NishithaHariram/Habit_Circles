import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TaskCompletion, TaskGroup } from '../../lib/types';
import { User, Mail, Phone, Calendar, TrendingUp, CheckCircle2, Clock, Award } from 'lucide-react';

export function Profile() {
  const { profile } = useAuth();
  const [taskHistory, setTaskHistory] = useState<(TaskCompletion & { task_group: TaskGroup })[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchTaskHistory();
  }, [profile]);

  const fetchTaskHistory = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('task_completions')
      .select('*, task_groups(*)')
      .eq('user_id', profile.id)
      .order('completion_date', { ascending: false })
      .limit(showAll ? 100 : 10);

    if (data) {
      const history = data.map((item: any) => ({
        ...item,
        task_group: item.task_groups,
      }));
      setTaskHistory(history);
    }
  };

  useEffect(() => {
    fetchTaskHistory();
  }, [showAll]);

  const completionRate = profile?.tasks_completed && (profile.tasks_completed + profile.tasks_pending) > 0
    ? Math.round((profile.tasks_completed / (profile.tasks_completed + profile.tasks_pending)) * 100)
    : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
              <User className="w-16 h-16 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
              {profile?.username}
            </h2>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{profile?.email}</span>
              </div>

              {profile?.age && (
                <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">{profile.age} years old</span>
                </div>
              )}

              {profile?.phone_number && (
                <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-sm">{profile.phone_number}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-green-100 text-sm mb-1">Tasks Completed</p>
              <p className="text-3xl font-bold">{profile?.tasks_completed || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-orange-100 text-sm mb-1">Tasks Pending</p>
              <p className="text-3xl font-bold">{profile?.tasks_pending || 0}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-purple-100 text-sm mb-1">Completion Rate</p>
              <p className="text-3xl font-bold">{completionRate}%</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-8 h-8 opacity-80" />
              </div>
              <p className="text-blue-100 text-sm mb-1">Requests Left</p>
              <p className="text-3xl font-bold">{4 - (profile?.excuse_requests_this_month || 0)}/4</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Task History</h3>
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium text-sm"
              >
                {showAll ? 'Show Less' : 'View More'}
              </button>
            </div>

            <div className="space-y-3">
              {taskHistory.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No task history yet</p>
              ) : (
                taskHistory.map((completion) => (
                  <div
                    key={completion.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {completion.task_group.task_name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(completion.completion_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center space-x-1 text-green-600 dark:text-green-400 font-semibold">
                          <span>+{completion.xp_earned}</span>
                          <span className="text-xs">XP</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
