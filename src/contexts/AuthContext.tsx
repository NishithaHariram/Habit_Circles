import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  const fetchProfile = async (userId: string, forceRefresh = false) => {
    if (isFetchingProfile && !forceRefresh) {
      return profile;
    }

    setIsFetchingProfile(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id, true);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        if (!mounted) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(profileData);
          }
        }
        if (mounted) {
          setLoading(false);
        }
      })();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          await new Promise(resolve => setTimeout(resolve, 300));

          const profileData = await fetchProfile(session.user.id);
          if (mounted) {
            setProfile(profileData);
          }
        } else if (!session?.user) {
          setProfile(null);
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          throw new Error('Too many requests, please wait and try again');
        }
        throw error;
      }

      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 800));

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            email,
            xp: 100,
            excuse_requests_this_month: 0,
            tasks_completed: 0,
            tasks_pending: 0,
          });

        if (profileError) {
          if (profileError.message?.includes('duplicate') || profileError.code === '23505') {
            return;
          }

          if (profileError.message?.includes('rate limit') || profileError.message?.includes('429')) {
            throw new Error('Too many requests, please wait and try again');
          }

          throw profileError;
        }
      }
    } catch (error: any) {
      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        throw new Error('Too many requests, please wait and try again');
      }
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message?.includes('rate limit') || error.message?.includes('429')) {
          throw new Error('Too many requests, please wait and try again');
        }
        throw error;
      }
    } catch (error: any) {
      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        throw new Error('Too many requests, please wait and try again');
      }
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
