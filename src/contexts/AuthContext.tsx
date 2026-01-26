import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRow } from '../types/database';

// DEV MODE: Set to true to bypass authentication during development
const DEV_MODE = false;

// Mock user for development
const MOCK_USER: UserRow = {
  id: '00000000-0000-0000-0000-000000000001',
  org_id: '00000000-0000-0000-0000-000000000000',
  email: 'ryan@useallfive.com',
  name: 'Ryan (Dev Mode)',
  role: 'admin',
  slack_user_id: null,
  hourly_rate: 150,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface AuthContextType {
  user: UserRow | null;
  loading: boolean;
  error: Error | null;
  signInWithSlack: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRow | null>(DEV_MODE ? MOCK_USER : null);
  const [loading, setLoading] = useState(!DEV_MODE);
  const [error, setError] = useState<Error | null>(null);
  const initialized = useRef(false);

  const fetchUserProfile = useCallback(async (email: string) => {
    console.log('🔍 Fetching profile for email:', email);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
        return null;
      }

      console.log('✅ Found profile:', profile);
      return profile;
    } catch (err) {
      console.error('❌ Error in fetchUserProfile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    // Skip auth initialization in dev mode
    if (DEV_MODE) {
      console.log('🔧 DEV MODE: Using mock user:', MOCK_USER.name);
      return;
    }

    // Prevent double-initialization in React strict mode
    if (initialized.current) {
      console.log('⏭️ Auth already initialized, skipping');
      return;
    }
    initialized.current = true;

    // Check for existing session
    async function initAuth() {
      console.log('🚀 Initializing auth...');
      setLoading(true);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('📦 Session:', session ? 'exists' : 'none');
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }

        if (session?.user?.email) {
          console.log('👤 Session user email:', session.user.email);
          const profile = await fetchUserProfile(session.user.email);
          setUser(profile);
        } else {
          console.log('⚠️ No session or no email in session');
        }
      } catch (err) {
        // Ignore abort errors from React strict mode
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('⏭️ Auth init aborted (React strict mode)');
          return;
        }
        console.error('❌ Auth init error:', err);
        setError(err instanceof Error ? err : new Error('Auth initialization failed'));
      } finally {
        console.log('✅ Auth init complete, setting loading to false');
        setLoading(false);
      }
    }

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email);
        if (event === 'SIGNED_IN' && session?.user?.email) {
          const profile = await fetchUserProfile(session.user.email);
          setUser(profile);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const signInWithSlack = async () => {
    if (DEV_MODE) {
      console.log('🔧 DEV MODE: Sign in bypassed');
      setUser(MOCK_USER);
      return;
    }

    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'slack_oidc',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'openid profile email'
        }
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sign in failed'));
      throw err;
    }
  };

  const signOut = async () => {
    if (DEV_MODE) {
      console.log('🔧 DEV MODE: Sign out bypassed');
      setUser(null);
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Sign out failed'));
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signInWithSlack,
    signOut,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
