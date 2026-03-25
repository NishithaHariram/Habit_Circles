import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Moon, Sun, User, Bell, Shield, Info } from 'lucide-react';

export function Settings() {
  const { isDark, toggleTheme } = useTheme();
  const { profile } = useAuth();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Username</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{profile?.username}</p>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{profile?.email}</p>
              </div>
            </div>

            <div className="flex justify-between items-center py-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Member Since</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              {isDark ? (
                <Moon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              ) : (
                <Sun className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Appearance</h2>
          </div>

          <div className="flex justify-between items-center py-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Theme</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                isDark ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  isDark ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Task Reminders</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get reminded about incomplete tasks</p>
              </div>
              <div className="relative inline-flex h-8 w-14 items-center rounded-full bg-blue-600">
                <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-7" />
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Group Updates</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Notifications from your groups</p>
              </div>
              <div className="relative inline-flex h-8 w-14 items-center rounded-full bg-blue-600">
                <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-7" />
              </div>
            </div>

            <div className="flex justify-between items-center py-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Streak Alerts</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Warning when streak is at risk</p>
              </div>
              <div className="relative inline-flex h-8 w-14 items-center rounded-full bg-blue-600">
                <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-7" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Info className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">About</h2>
          </div>

          <div className="space-y-4">
            <div className="py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-white">Version</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">1.0.0</p>
            </div>

            <div className="py-3">
              <p className="font-medium text-gray-900 dark:text-white">Habit Circles</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A social habit tracking platform for building better habits together
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
