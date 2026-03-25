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
    if (!profile) return;

    const inviteCode = !isPublic ? generateInviteCode() : null;

    const { data: group, error } = await supabase
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

    if (error) {
      alert('Failed to create group');
      return;
    }

    await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: profile.id,
      role: 'creator',
    });

    if (!isPublic && inviteCode) {
      alert(`Group created! Invite code: ${inviteCode}`);
    }

    onCreated();
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Name
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Describe your habit..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Duration (minutes per day)
            </label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              min={1}
              max={1440}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
              Max Members
            </label>
            <input
              type="number"
              value={maxMembers}
              onChange={(e) => setMaxMembers(parseInt(e.target.value))}
              min={2}
              max={100}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
