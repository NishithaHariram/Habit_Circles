import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppState } from '../../contexts/AppStateContext';
import { profileService } from '../../services/profileService';
import { User, Mail, Phone, Calendar, TrendingUp, CheckCircle2, Clock, Award, CreditCard as Edit2, Save, X } from 'lucide-react';
import { Avatar } from '../Avatar/Avatar';

export function Profile() {
  const { profile, setProfile } = useAuth();
  const { state, updateTaskHistory } = useAppState();
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

    console.log('[Profile] Fetching task history');
    try {
      const history = await profileService.fetchTaskHistory(profile.id, showAll ? 100 : 10);
      updateTaskHistory(history);
    } catch (err) {
      console.error('[Profile] Error fetching task history:', err);
    }
  };

  useEffect(() => {
    fetchTaskHistory();
  }, [showAll]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    console.log('[Profile] Validating form data:', formData);

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

    console.log('[Profile] Form validation passed');
    return true;
  };

  const handleSave = async () => {
    console.log('[Profile] Save button clicked');
    setError('');
    setSuccessMessage('');

    if (!validateForm()) {
      console.log('[Profile] Form validation failed');
      return;
    }

    if (!profile) {
      console.error('[Profile] No profile found');
      setError('No profile found');
      return;
    }

    setIsSaving(true);
    console.log('[Profile] Starting profile update...');

    try {
      const updates = {
        username: formData.username,
        email: formData.email,
        age: formData.age ? parseInt(formData.age) : undefined,
        phone_number: formData.phone_number || undefined,
      };

      console.log('[Profile] Updating profile with:', updates);

      const updatedProfile = await profileService.updateProfile(profile.id, updates);

      setProfile(updatedProfile);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      console.log('[Profile] Profile updated successfully');
    } catch (err: any) {
      console.error('[Profile] Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    console.log('[Profile] Cancel edit clicked');

    if (profile) {
      setFormData({
        username: profile.username || '',
        email: profile.email || '',
        age: profile.age ? profile.age.toString() : '',
        phone_number: profile.phone_number || '',
      });
    }
    setIsEditing(false);
    setError('');
  };

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-6">
            <Avatar
              hatId={profile.avatar_hat_id}
              shirtId={profile.avatar_shirt_id}
              pantsId={profile.avatar_pants_id}
              accessoryId={profile.avatar_accessory_id}
              size="large"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {profile.username}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">{profile.email}</p>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Age
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleInputChange('phone_number', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Username</p>
                <p className="font-medium text-gray-900 dark:text-white">{profile.username}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900 dark:text-white">{profile.email}</p>
              </div>
            </div>

            {profile.age && (
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Age</p>
                  <p className="font-medium text-gray-900 dark:text-white">{profile.age}</p>
                </div>
              </div>
            )}

            {profile.phone_number && (
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white">{profile.phone_number}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total XP</p>
              <p className="text-3xl font-bold">{profile.xp}</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">Tasks Completed</p>
              <p className="text-3xl font-bold">{profile.tasks_completed}</p>
            </div>
            <CheckCircle2 className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mb-1">Excuses Left</p>
              <p className="text-3xl font-bold">{4 - profile.excuse_requests_this_month}</p>
            </div>
            <Award className="w-12 h-12 opacity-80" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task History</h2>
          {state.taskHistory.length >= 10 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              {showAll ? 'Show Less' : 'Show All'}
            </button>
          )}
        </div>

        {state.taskHistory.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 py-8">
            No task history yet. Complete tasks to see them here!
          </p>
        ) : (
          <div className="space-y-4">
            {state.taskHistory.map((completion) => (
              <div
                key={completion.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {completion.task_group?.task_name || 'Unknown Task'}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(completion.completion_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>+{completion.xp_earned} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
