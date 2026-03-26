import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppState } from '../../contexts/AppStateContext';
import { taskService } from '../../services/taskService';
import { TrendingUp, Target, Award, AlertCircle, Loader2 } from 'lucide-react';
import { TaskCard } from './TaskCard';

interface TimerState {
  taskId: string;
  endTime: number;
  durationMinutes: number;
  isPaused: boolean;
  pausedTimeLeft?: number;
}

export function Dashboard() {
  const { profile, setProfile, refreshTrigger } = useAuth();
  const { state, updateMyGroups, refreshKey, triggerRefresh } = useAppState();
  const [loading, setLoading] = useState(true);
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const [timers, setTimers] = useState<Map<string, number>>(new Map());
  const [runningTimers, setRunningTimers] = useState<Set<string>>(new Set());
  const [pausedTimers, setPausedTimers] = useState<Set<string>>(new Set());
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const fetchData = useCallback(async () => {
    if (!profile) return;

    console.log('[Dashboard] Fetching my groups');
    setLoading(true);
    try {
      const groups = await taskService.fetchMyGroups(profile.id);
      updateMyGroups(groups);
    } catch (err) {
      console.error('[Dashboard] Error fetching groups:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [profile, updateMyGroups]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger, refreshKey]);

  useEffect(() => {
    loadTimersFromStorage();

    return () => {
      intervalsRef.current.forEach(interval => clearInterval(interval));
      intervalsRef.current.clear();
    };
  }, []);

  const loadTimersFromStorage = () => {
    console.log('[Dashboard] Loading timers from localStorage');
    try {
      const stored = localStorage.getItem('taskTimers');
      if (stored) {
        const timerStates: TimerState[] = JSON.parse(stored);
        console.log('[Dashboard] Found stored timers:', timerStates);

        timerStates.forEach(state => {
          if (!state.isPaused) {
            const now = Date.now();
            const timeLeft = Math.max(0, Math.floor((state.endTime - now) / 1000));

            if (timeLeft > 0) {
              console.log(`[Dashboard] Resuming timer for task ${state.taskId}, ${timeLeft}s remaining`);
              setTimers(prev => new Map(prev).set(state.taskId, timeLeft));
              setRunningTimers(prev => new Set(prev).add(state.taskId));
              startTimerInterval(state.taskId, timeLeft);
            } else {
              console.log(`[Dashboard] Timer for task ${state.taskId} has expired, removing`);
              removeTimerFromStorage(state.taskId);
            }
          } else if (state.pausedTimeLeft) {
            console.log(`[Dashboard] Loading paused timer for task ${state.taskId}, ${state.pausedTimeLeft}s remaining`);
            setTimers(prev => new Map(prev).set(state.taskId, state.pausedTimeLeft));
            setPausedTimers(prev => new Set(prev).add(state.taskId));
          }
        });
      }
    } catch (err) {
      console.error('[Dashboard] Error loading timers from storage:', err);
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
      console.log('[Dashboard] Timer saved to storage:', newState);
    } catch (err) {
      console.error('[Dashboard] Error saving timer to storage:', err);
    }
  };

  const removeTimerFromStorage = (taskId: string) => {
    try {
      const stored = localStorage.getItem('taskTimers');
      if (stored) {
        const timers: TimerState[] = JSON.parse(stored);
        const filtered = timers.filter(t => t.taskId !== taskId);
        localStorage.setItem('taskTimers', JSON.stringify(filtered));
        console.log(`[Dashboard] Timer ${taskId} removed from storage`);
      }
    } catch (err) {
      console.error('[Dashboard] Error removing timer from storage:', err);
    }
  };

  const startTimerInterval = (taskId: string, initialTimeLeft: number) => {
    if (intervalsRef.current.has(taskId)) {
      clearInterval(intervalsRef.current.get(taskId)!);
    }

    let currentTimeLeft = initialTimeLeft;

    const interval = setInterval(() => {
      currentTimeLeft -= 1;
      setTimers(prev => new Map(prev).set(taskId, currentTimeLeft));

      if (currentTimeLeft <= 0) {
        console.log(`[Dashboard] Timer completed for ${taskId}`);
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

  const handleStartTimer = (groupId: string, durationMinutes: number) => {
    console.log('[Dashboard] Starting timer:', groupId, durationMinutes);

    if (runningTimers.has(groupId) || pausedTimers.has(groupId)) {
      console.log('[Dashboard] Timer already exists for this task');
      return;
    }

    const totalSeconds = durationMinutes * 60;
    const endTime = Date.now() + totalSeconds * 1000;

    setTimers(prev => new Map(prev).set(groupId, totalSeconds));
    setRunningTimers(prev => new Set(prev).add(groupId));
    saveTimerToStorage(groupId, endTime, durationMinutes, false);
    startTimerInterval(groupId, totalSeconds);
  };

  const handlePauseTimer = (groupId: string) => {
    console.log('[Dashboard] Pausing timer:', groupId);

    const interval = intervalsRef.current.get(groupId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(groupId);
    }

    const timeLeft = timers.get(groupId) || 0;
    setRunningTimers(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
    setPausedTimers(prev => new Set(prev).add(groupId));
    saveTimerToStorage(groupId, 0, 0, true, timeLeft);
  };

  const handleResumeTimer = (groupId: string) => {
    console.log('[Dashboard] Resuming timer:', groupId);

    const timeLeft = timers.get(groupId) || 0;
    const endTime = Date.now() + timeLeft * 1000;

    const group = state.myGroups.find(g => g.id === groupId);
    const durationMinutes = group?.duration_minutes || 0;

    setPausedTimers(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
    setRunningTimers(prev => new Set(prev).add(groupId));
    saveTimerToStorage(groupId, endTime, durationMinutes, false);
    startTimerInterval(groupId, timeLeft);
  };

  const handleResetTimer = (groupId: string, durationMinutes: number) => {
    console.log('[Dashboard] Resetting timer:', groupId);

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
    console.log('[Dashboard] Timer completed, auto-completing task:', groupId);

    const group = state.myGroups.find(g => g.id === groupId);
    if (group) {
      await handleCompleteTask(groupId, group.duration_minutes, group.task_name);
    }

    setTimers(prev => {
      const newMap = new Map(prev);
      newMap.delete(groupId);
      return newMap;
    });
  };

  const handleCompleteTask = async (groupId: string, durationMinutes: number, taskName: string) => {
    console.log('[Dashboard] Completing task:', { groupId, durationMinutes, taskName });

    handleResetTimer(groupId, durationMinutes);

    if (!profile) {
      console.error('[Dashboard] No profile found');
      setError('Please log in to complete tasks');
      return;
    }

    if (completingTasks.has(groupId)) {
      console.log('[Dashboard] Task already being completed, ignoring duplicate');
      return;
    }

    setCompletingTasks(prev => new Set(prev).add(groupId));
    setError('');
    setSuccessMessage('');

    try {
      const result = await taskService.completeTask(
        groupId,
        profile.id,
        durationMinutes,
        taskName,
        profile
      );

      setProfile({
        ...profile,
        xp: result.newXP,
        tasks_completed: result.newTasksCompleted,
      });

      setSuccessMessage(`Task completed! +${durationMinutes * 10} XP`);
      setTimeout(() => setSuccessMessage(''), 3000);

      await fetchData();
      triggerRefresh();
    } catch (err: any) {
      console.error('[Dashboard] Error completing task:', err);
      setError(err.message || 'Failed to complete task');
    } finally {
      setCompletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
    }
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

  if (loading && state.myGroups.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total XP</p>
              <p className="text-3xl font-bold">{profile?.xp || 0}</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Tasks Completed</p>
              <p className="text-3xl font-bold">{profile?.tasks_completed || 0}</p>
            </div>
            <Target className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg p-6">
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

        {state.myGroups.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No active task groups. Join or create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {state.myGroups.map((group) => {
              const isCompleting = completingTasks.has(group.id);
              const hasTimer = timers.has(group.id);
              const isRunning = runningTimers.has(group.id);
              const isPaused = pausedTimers.has(group.id);
              const timeLeft = timers.get(group.id) || 0;
              const progress = hasTimer ? getProgress(group.id, group.duration_minutes) : 0;

              return (
                <TaskCard
                  key={group.id}
                  group={group}
                  isCompleting={isCompleting}
                  hasTimer={hasTimer}
                  isRunning={isRunning}
                  isPaused={isPaused}
                  timeLeft={timeLeft}
                  progress={progress}
                  onComplete={handleCompleteTask}
                  onStartTimer={handleStartTimer}
                  onPauseTimer={handlePauseTimer}
                  onResumeTimer={handleResumeTimer}
                  onResetTimer={handleResetTimer}
                  formatTime={formatTime}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
