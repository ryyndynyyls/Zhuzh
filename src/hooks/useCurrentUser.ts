import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRow } from '../types/database';

export function useCurrentUser() {
  const [user, setUser] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);

      try {
        // Get auth user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!authUser || !authUser.email) {
          setUser(null);
          return;
        }

        // Get user profile from database
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single();

        if (profileError) throw profileError;
        setUser(profile);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      } finally {
        setLoading(false);
      }
    }

    fetchUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, error, isAuthenticated: !!user };
}
