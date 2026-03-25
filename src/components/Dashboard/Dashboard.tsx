import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TaskGroup, GroupMember, TaskCompletion } from '../../lib/types';
import { CheckCircle2, Circle, TrendingUp, Target, Award, AlertCircle, Loader2, Play, Pause, RotateCcw, Flame } from 'lucide-react';

interface TimerState {
  taskId: string;
  endTime: number;
  durationMinutes: number;
  isPaused: boolean;
  pausedTimeLeft?: number;
}

export function Dashboard() {
  const { profile, setProfile, refreshTrigger } = useAuth();
  const [myGroups, setMyGroups] = useState<(TaskGroup & { member?: GroupMember; completion?: TaskCompletion })[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const [timers, setTimers] = useState<Map<string, number>>(new Map());
  const [runningTimers, setRunningTimers] = useState<Set<string>>(new Set());
  const [pausedTimers, setPausedTimers] = useState<Set<string>>(new Set());
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    fetchMyGroups();
  }, [profile, refreshTrigger]);

  useEffect(() => {
    loadTimersFromStorage();

    return () => {
      intervalsRef.current.forEach(interval => clearInterval(interval));
      intervalsRef.current.clear();
    };
  }, []);

  const loadTimersFromStorage = () => {
    console.log('=== Loading Timers from LocalStorage ===');
    try {
      const stored = localStorage.getItem('taskTimers');
      if (stored) {
        const timerStates: TimerState[] = JSON.parse(stored);
        console.log('Found stored timers:', timerStates);

        timerStates.forEach(state => {
          if (!state.isPaused) {
            const now = Date.now();
            const timeLeft = Math.max(0, Math.floor((state.endTime - now) / 1000));

            if (timeLeft > 0) {
              console.log(`Resuming timer for task ${state.taskId}, ${timeLeft}s remaining`);
              setTimers(prev => new Map(prev).set(state.taskId, timeLeft));
              setRunningTimers(prev => new Set(prev).add(state.taskId));
              startTimerInterval(state.taskId, timeLeft);
            } else {
              console.log(`Timer for task ${state.taskId} has expired, removing`);
              removeTimerFromStorage(state.taskId);
            }
          } else if (state.pausedTimeLeft) {
            console.log(`Loading paused timer for task ${state.taskId}, ${state.pausedTimeLeft}s remaining`);
            setTimers(prev => new Map(prev).set(state.taskId, state.pausedTimeLeft));
            setPausedTimers(prev => new Set(prev).add(state.taskId));
          }
        });
      }
    } catch (err) {
      console.error('Error loading timers from storage:', err);
    }
  };

  const saveTimerToStorage = (taskId: string, endTime: number, durationMinutes: number, isPaused: boolean, pausedTimeLeft?: number) => {
    try {
      const stored = localStorage.getItem('taskTimers');
      const timers: TimerState[] = stored ? JSON.parse(stored) : [];

      const existing = timers.findIndex(t => t.taskId === taskId);
      const newState: TimerState = { taskId, endTime, durationMinutes, isPaused, pausedTimeLeft };

      if (existing >= 0) {
        timers[existing] = newState;
      } else {
        timers.push(newState);
      }

      localStorage.setItem('taskTimers', JSON.stringify(timers));
      console.log('Timer saved to storage:', newState);
    } catch (err) {
      console.error('Error saving timer to storage:', err);
    }
  };

  const removeTimerFromStorage = (taskId: string) => {
    try {
      const stored = localStorage.getItem('taskTimers');
      if (stored) {
        const timers: TimerState[] = JSON.parse(stored);
        const filtered = timers.filter(t => t.taskId !== taskId);
        localStorage.setItem('taskTimers', JSON.stringify(filtered));
        console.log(`Timer ${taskId} removed from storage`);
      }
    } catch (err) {
      console.error('Error removing timer from storage:', err);
    }
  };

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

  const startTimerInterval = (taskId: string, initialTimeLeft: number) => {
    if (intervalsRef.current.has(taskId)) {
      clearInterval(intervalsRef.current.get(taskId)!);
    }

    let currentTimeLeft = initialTimeLeft;

    const interval = setInterval(() => {
      currentTimeLeft -= 1;
      console.log(`Timer tick for ${taskId}: ${currentTimeLeft}s remaining`);

      setTimers(prev => new Map(prev).set(taskId, currentTimeLeft));

      if (currentTimeLeft <= 0) {
        console.log(`Timer completed for ${taskId}`);
        clearInterval(interval);
        intervalsRef.current.delete(taskId);
        setRunningTimers(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        removeTimerFromStorage(taskId);
        handleTimerComplete(taskId);
      }
    }, 1000);

    intervalsRef.current.set(taskId, interval);
  };

  const startTimer = (groupId: string, durationMinutes: number, taskName: string) => {
    console.log('=== Timer Started ===');
    console.log('Task ID:', groupId);
    console.log('Task Name:', taskName);
    console.log('Duration:', durationMinutes, 'minutes');

    if (runningTimers.has(groupId) || pausedTimers.has(groupId)) {
      console.log('Timer already exists for this task');
      return;
    }

    const totalSeconds = durationMinutes * 60;
    const endTime = Date.now() + totalSeconds * 1000;

    console.log('Total seconds:', totalSeconds);
    console.log('End time:', new Date(endTime).toLocaleTimeString());

    setTimers(prev => new Map(prev).set(groupId, totalSeconds));
    setRunningTimers(prev => new Set(prev).add(groupId));
    saveTimerToStorage(groupId, endTime, durationMinutes, false);
    startTimerInterval(groupId, totalSeconds);
  };

  const pauseTimer = (groupId: string) => {
    console.log('=== Timer Paused ===');
    console.log('Task ID:', groupId);

    const interval = intervalsRef.current.get(groupId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(groupId);
    }

    const timeLeft = timers.get(groupId) || 0;
    console.log('Time remaining when paused:', timeLeft, 'seconds');

    setRunningTimers(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
    setPausedTimers(prev => new Set(prev).add(groupId));

    saveTimerToStorage(groupId, 0, 0, true, timeLeft);
  };

  const resumeTimer = (groupId: string, durationMinutes: number) => {
    console.log('=== Timer Resumed ===');
    console.log('Task ID:', groupId);

    const timeLeft = timers.get(groupId) || 0;
    const endTime = Date.now() + timeLeft * 1000;

    console.log('Resuming with', timeLeft, 'seconds remaining');
    console.log('New end time:', new Date(endTime).toLocaleTimeString());

    setPausedTimers(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
    setRunningTimers(prev => new Set(prev).add(groupId));

    saveTimerToStorage(groupId, endTime, durationMinutes, false);
    startTimerInterval(groupId, timeLeft);
  };

  const resetTimer = (groupId: string) => {
    console.log('=== Timer Reset ===');
    console.log('Task ID:', groupId);

    const interval = intervalsRef.current.get(groupId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(groupId);
    }

    setTimers(prev => {
      const newMap = new Map(prev);
      newMap.delete(groupId);
      return newMap;
    });
    setRunningTimers(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
    setPausedTimers(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });

    removeTimerFromStorage(groupId);
  };

  const handleTimerComplete = async (groupId: string) => {
    console.log('=== Timer Completed - Auto-completing task ===');

    const group = myGroups.find(g => g.id === groupId);
    if (group) {
      await completeTask(groupId, group.duration_minutes, group.task_name, true);
    }

    setTimers(prev => {
      const newMap = new Map(prev);
      newMap.delete(groupId);
      return newMap;
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (groupId: string, durationMinutes: number): number => {
    const timeLeft = timers.get(groupId) || 0;
    const totalSeconds = durationMinutes * 60;
    return ((totalSeconds - timeLeft) / totalSeconds) * 100;
  };

  const completeTask = async (groupId: string, durationMinutes: number, taskName: string, autoCompleted = false) => {
    console.log(autoCompleted ? '=== Auto-Completing Task (Timer Finished) ===' : '=== Mark as Done Clicked ===');
    console.log('Task ID:', groupId);
    console.log('Task Name:', taskName);
    console.log('Duration (minutes):', durationMinutes);

    resetTimer(groupId);

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

      console.log('Fetching current member data for streak calculation...');
      const { data: memberData } = await supabase
        .from('group_members')
        .select('user_streak, last_completed_date')
        .eq('group_id', groupId)
        .eq('user_id', profile.id)
        .maybeSingle();

      let newStreak = 1;
      if (memberData) {
        const lastCompleted = memberData.last_completed_date;
        console.log('Last completed date:', lastCompleted);
        console.log('Current streak:', memberData.user_streak);

        if (lastCompleted) {
          const lastDate = new Date(lastCompleted);
          const todayDate = new Date(today);
          const diffTime = todayDate.getTime() - lastDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          console.log('Days since last completion:', diffDays);

          if (diffDays === 1) {
            newStreak = memberData.user_streak + 1;
            console.log('Consecutive day! Increasing streak to:', newStreak);
          } else if (diffDays > 1) {
            newStreak = 1;
            console.log('Streak broken! Resetting to 1');
          } else {
            newStreak = memberData.user_streak;
            console.log('Same day completion, maintaining streak:', newStreak);
          }
        } else {
          console.log('First completion! Starting streak at 1');
        }
      }

      console.log('Updating member streak...');
      const { error: streakError } = await supabase
        .from('group_members')
        .update({
          user_streak: newStreak,
          last_completed_date: today,
        })
        .eq('group_id', groupId)
        .eq('user_id', profile.id);

      if (streakError) {
        console.error('Error updating streak:', streakError);
      } else {
        console.log('Streak updated successfully! New streak:', newStreak);
      }

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

      setSuccessMessage(`Task completed! +${xpEarned} XP earned!${newStreak > 1 ? ` ${newStreak}-day streak! 🔥` : ''}`);
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
              const hasTimer = timers.has(group.id);
              const isRunning = runningTimers.has(group.id);
              const isPaused = pausedTimers.has(group.id);
              const timeLeft = timers.get(group.id) || 0;
              const progress = hasTimer ? getProgress(group.id, group.duration_minutes) : 0;

              return (
                <div
                  key={group.id}
                  className={`border rounded-lg overflow-hidden transition-all duration-300 relative ${
                    isCompleted
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                      : isRunning
                      ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg'
                  }`}
                >
                  {hasTimer && !isCompleted && (
                    <div className="h-2 bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full transition-all duration-1000 ease-linear ${
                          isRunning ? 'bg-blue-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}

                  <div className="p-5">
                    {group.member && group.member.user_streak > 0 && (
                      <div className="absolute top-3 right-3 flex items-center space-x-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full shadow-md animate-pulse">
                        <Flame className="w-4 h-4" />
                        <span className="text-sm font-bold">{group.member.user_streak}</span>
                      </div>
                    )}
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
                          {hasTimer && !isCompleted && (
                            <div className="mt-2">
                              <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full font-mono text-lg font-bold ${
                                isRunning
                                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                  : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                              }`}>
                                <span>{formatTime(timeLeft)}</span>
                                {isPaused && <span className="text-xs font-normal">(Paused)</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {!isCompleted && (
                        <div className="flex items-center space-x-2">
                          {!hasTimer ? (
                            <>
                              <button
                                onClick={() => startTimer(group.id, group.duration_minutes, group.task_name)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-all font-medium flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                              >
                                <Play className="w-4 h-4" />
                                <span>Start Timer</span>
                              </button>
                              <button
                                onClick={() => completeTask(group.id, group.duration_minutes, group.task_name)}
                                disabled={isCompleting}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg transition-all font-medium flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
                              >
                                {isCompleting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Saving...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Mark Done</span>
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <>
                              {isRunning && (
                                <button
                                  onClick={() => pauseTimer(group.id)}
                                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg transition-all font-medium flex items-center space-x-2 shadow-md hover:shadow-lg"
                                >
                                  <Pause className="w-4 h-4" />
                                  <span>Pause</span>
                                </button>
                              )}
                              {isPaused && (
                                <button
                                  onClick={() => resumeTimer(group.id, group.duration_minutes)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-all font-medium flex items-center space-x-2 shadow-md hover:shadow-lg"
                                >
                                  <Play className="w-4 h-4" />
                                  <span>Resume</span>
                                </button>
                              )}
                              <button
                                onClick={() => resetTimer(group.id)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2.5 rounded-lg transition-all font-medium flex items-center space-x-2 shadow-md hover:shadow-lg"
                                title="Reset Timer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
