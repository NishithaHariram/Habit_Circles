import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  const { profile } = useAuth();
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isPublic, setIsPublic] = useState(true);
  const [maxMembers, setMaxMembers] = useState(10);
  const [repeatDays, setRepeatDays] = useState([true, true, true, true, true, true, true]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Create Task button clicked');

    if (loading) {
      console.log('Already submitting, ignoring click');
      return;
    }

    if (!profile) {
      console.error('No profile found');
      setError('User profile not found. Please try logging in again.');
      return;
    }

    if (!taskName.trim()) {
      console.error('Task name is required');
      setError('Task name is required');
      return;
    }

    if (durationMinutes < 1) {
      console.error('Duration must be at least 1 minute');
      setError('Duration must be at least 1 minute');
      return;
    }

    setError('');
    setSuccessMessage('');
    setLoading(true);

    console.log('Creating task with data:', {
      task_name: taskName,
      description,
      duration_minutes: durationMinutes,
      is_public: isPublic,
      max_members: maxMembers,
      repeat_days: repeatDays,
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const inviteCode = !isPublic ? generateInviteCode() : null;

      console.log('Inserting task group into database...');
      const { data: group, error: groupError } = await supabase
        .from('task_groups')
        .insert({
          creator_id: profile.id,
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
        console.error('Error creating task group:', groupError);

        if (groupError.message?.includes('rate limit') || groupError.message?.includes('429')) {
          throw new Error('Too many requests, please wait and try again');
        }

        throw new Error(groupError.message || 'Failed to create group');
      }

      console.log('Task group created successfully:', group);

      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('Adding creator as group member...');
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: profile.id,
        role: 'creator',
      });

      if (memberError) {
        console.error('Error adding member:', memberError);

        if (memberError.message?.includes('rate limit') || memberError.message?.includes('429')) {
          throw new Error('Too many requests, please wait and try again');
        }

        if (!memberError.message?.includes('duplicate')) {
          throw new Error(memberError.message || 'Failed to join group');
        }
      }

      console.log('Task created successfully!');

      if (!isPublic && inviteCode) {
        setSuccessMessage(`Group created! Invite code: ${inviteCode}`);
        setTimeout(() => {
          onCreated();
        }, 2000);
      } else {
        setSuccessMessage('Task group created successfully!');
        setTimeout(() => {
          onCreated();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'Failed to create task group');
      setLoading(false);
    }
  };

  const toggleDay = (index: number) => {
    const newDays = [...repeatDays];
    newDays[index] = !newDays[index];
    setRepeatDays(newDays);
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Task Group</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Name *
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="e.g., Morning Meditation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Describe your habit..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Duration (minutes per day) *
            </label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              min={1}
              max={1440}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Visibility
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Public</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Private (6-digit code)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max Members *
            </label>
            <input
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value))}
              min={2}
              max={100}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Repeat Days
            </label>
            <div className="flex flex-wrap gap-2">
              {dayNames.map((day, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    repeatDays[index]
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
