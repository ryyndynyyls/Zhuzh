/**
 * useCurrentUser Hook
 *
 * MIGRATED: Now delegates to AuthContext instead of querying Supabase directly.
 * AuthContext already caches the user profile with 24h TTL.
 *
 * This hook exists for backwards compatibility — consumers can continue using
 * `const { user, loading, error, isAuthenticated } = useCurrentUser()`
 * but it just reads from AuthContext.
 */

import { useAuth } from '../contexts/AuthContext';

export function useCurrentUser() {
  const { user, loading, error, isAuthenticated } = useAuth();
  return { user, loading, error, isAuthenticated };
}
