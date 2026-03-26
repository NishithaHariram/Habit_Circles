import { CheckCircle2, Circle, Flame, Play, Pause, RotateCcw } from 'lucide-react';
import { TaskGroup, GroupMember, TaskCompletion } from '../../lib/types';

interface TaskCardProps {
  group: TaskGroup & { member?: GroupMember; completion?: TaskCompletion };
  isCompleting: boolean;
  hasTimer: boolean;
  isRunning: boolean;
  isPaused: boolean;
  timeLeft: number;
  progress: number;
  onComplete: (groupId: string, durationMinutes: number, taskName: string) => void;
  onStartTimer: (groupId: string, durationMinutes: number) => void;
  onPauseTimer: (groupId: string) => void;
  onResumeTimer: (groupId: string) => void;
  onResetTimer: (groupId: string, durationMinutes: number) => void;
  formatTime: (seconds: number) => string;
}

export function TaskCard({
  group,
  isCompleting,
  hasTimer,
  isRunning,
  isPaused,
  timeLeft,
  progress,
  onComplete,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onResetTimer,
  formatTime,
}: TaskCardProps) {
  const isCompleted = !!group.completion;

  return (
    <div
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

        <button
          onClick={() => {
            if (!isCompleted && !isCompleting) {
              console.log('=== Quick Tick Button Clicked ===');
              console.log('Task ID:', group.id);
              console.log('Task Name:', group.task_name);
              onComplete(group.id, group.duration_minutes, group.task_name);
            }
          }}
          disabled={isCompleted || isCompleting}
          className={`absolute top-3 left-3 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 transform ${
            isCompleted
              ? 'bg-green-500 border-green-500 cursor-not-allowed scale-100'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 hover:scale-110 active:scale-95 cursor-pointer'
          } ${isCompleting ? 'opacity-50 cursor-wait animate-pulse' : ''}`}
          title={isCompleted ? 'Completed today' : 'Mark as complete'}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-white animate-in zoom-in duration-300" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors" />
          )}
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 ml-10">
            <div className="flex-1">
              <h3
                className={`font-semibold text-lg ${
                  isCompleted
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {group.task_name}
              </h3>
              <p
                className={`text-sm ${
                  isCompleted
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {group.duration_minutes} minutes • Streak: {group.group_streak} days
              </p>
              {isCompleted && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                  Completed Today ✓
                </p>
              )}
              {hasTimer && !isCompleted && (
                <div className="mt-2">
                  <div
                    className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full font-mono text-lg font-bold ${
                      isRunning
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                    }`}
                  >
                    <span>{formatTime(timeLeft)}</span>
                    {isPaused && <span className="text-xs font-normal">(Paused)</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isCompleted && (
            <div className="flex items-center space-x-2 ml-4">
              {hasTimer ? (
                <>
                  {isPaused ? (
                    <button
                      onClick={() => onResumeTimer(group.id)}
                      className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      title="Resume timer"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onPauseTimer(group.id)}
                      className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                      title="Pause timer"
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => onResetTimer(group.id, group.duration_minutes)}
                    className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    title="Reset timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onStartTimer(group.id, group.duration_minutes)}
                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  title="Start timer"
                >
                  <Play className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
