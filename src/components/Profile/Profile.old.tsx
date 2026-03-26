import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TaskCompletion, TaskGroup } from '../../lib/types';
import { User, Mail, Phone, Calendar, TrendingUp, CheckCircle2, Clock, Award, CreditCard as Edit2, Save, X } from 'lucide-react';
import { Avatar } from '../Avatar/Avatar';

export function Profile() {
  const { profile, setProfile } = useAuth();
  const [taskHistory, setTaskHistory] = useState<(TaskCompletion & { task_group: TaskGroup })[]>([]);
  const [showAll, setShowAll] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    age: '',
    phone_number: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
        age: profile.age ? profile.age.toString() : '',
        phone_number: profile.phone_number || '',
      });
    }
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    console.log('Validating form data:', formData);

    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }

    if (formData.username.length < 2) {
      setError('Username must be at least 2 characters');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.age && formData.age.trim() !== '') {
      const ageNum = parseInt(formData.age);
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        setError('Age must be between 13 and 120');
        return false;
      }
    }

    if (formData.phone_number && formData.phone_number.trim() !== '') {
      const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
      if (!phoneRegex.test(formData.phone_number)) {
        setError('Please enter a valid phone number (at least 10 digits)');
        return false;
      }
    }

    return true;
  };

  const handleSaveChanges = async () => {
    console.log('Save Changes button clicked');

    if (isSaving) {
      console.log('Already saving, ignoring click');
      return;
    }

    if (!profile) {
      console.error('No profile found');
      setError('Profile not found. Please try logging in again.');
      return;
    }

    if (!validateForm()) {
      console.error('Validation failed');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSaving(true);

    console.log('Updating profile:', {
      username: formData.username,
      email: formData.email,
      age: formData.age || null,
      phone_number: formData.phone_number || null,
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const updateData: any = {
        username: formData.username,
        email: formData.email,
        age: formData.age ? parseInt(formData.age) : null,
        phone_number: formData.phone_number || null,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw new Error(updateError.message || 'Failed to update profile');
      }

      console.log('Profile updated successfully:', updatedProfile);

      if (setProfile) {
        setProfile(updatedProfile);
      }

      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (err: any) {
      console.error('Error in handleSaveChanges:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    console.log('Cancel edit clicked');
    if (profile) {
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
        age: profile.age ? profile.age.toString() : '',
        phone_number: profile.phone_number || '',
      });
    }
    setError('');
    setSuccessMessage('');
    setIsEditing(false);
  };

  const completionRate = profile?.tasks_completed && (profile.tasks_completed + profile.tasks_pending) > 0
    ? Math.round((profile.tasks_completed / (profile.tasks_completed + profile.tasks_pending)) * 100)
    : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
        {!isEditing ? (
          <button
            onClick={() => {
              console.log('Edit Profile button clicked');
              setIsEditing(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg flex items-center space-x-2 transition-colors font-medium"
          >
            <Edit2 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-lg flex items-center space-x-2 transition-colors font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg flex items-center space-x-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-lg text-sm mb-6">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center">
              <User className="w-16 h-16 text-white" />
            </div>

            {!isEditing ? (
              <>
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
                  {profile?.username}
                </h2>

                <div className="mb-6 flex justify-center">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 shadow-inner">
                    <Avatar
                      shirt={profile?.equipped_shirt || 'default'}
                      pants={profile?.equipped_pants || 'blue'}
                      accessories={profile?.equipped_accessories || []}
                      size="medium"
                    />
                  </div>
                </div>

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
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    disabled={isSaving}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={isSaving}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Age
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    disabled={isSaving}
                    min="13"
                    max="120"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter age"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    disabled={isSaving}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            )}
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
