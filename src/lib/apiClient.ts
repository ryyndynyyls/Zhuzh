/**
 * API Client - Thin fetch wrapper for all frontend → API server calls
 *
 * All hooks should use this instead of direct Supabase queries.
 * The API server uses the service role key, bypassing RLS entirely.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

/**
 * Convenience methods
 */
export const api = {
  get: <T>(path: string) => apiFetch<T>(path),

  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, {
      method: 'DELETE',
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
};
