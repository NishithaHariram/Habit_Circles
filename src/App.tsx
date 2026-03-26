import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppStateProvider } from './contexts/AppStateContext';
import { Login } from './components/Auth/Login';
import { SignUp } from './components/Auth/SignUp';
import { Navbar } from './components/Layout/Navbar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { Groups } from './components/Groups/Groups';
import { Store } from './components/Store/Store';
import { Profile } from './components/Profile/Profile';
import { Journal } from './components/Journal/Journal';
import { Settings } from './components/Settings/Settings';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return authMode === 'login' ? (
      <Login onSwitchToSignUp={() => setAuthMode('signup')} />
    ) : (
      <SignUp onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main>
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'groups' && <Groups />}
        {currentPage === 'store' && <Store />}
        {currentPage === 'profile' && <Profile />}
        {currentPage === 'journal' && <Journal />}
        {currentPage === 'settings' && <Settings />}
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppStateProvider>
          <MainApp />
        </AppStateProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
