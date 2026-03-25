import { useAuth } from '../../contexts/AuthContext';
import { Home, Users, ShoppingBag, User, BookOpen, Settings, LogOut, Zap } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { profile, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'store', label: 'Store', icon: ShoppingBag },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Habit Circles</span>
          </div>

          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    currentPage === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 rounded-lg">
              <Zap className="w-4 h-4 text-white" />
              <span className="font-bold text-white">{profile?.xp || 0} XP</span>
            </div>
            <button
              onClick={signOut}
              className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
