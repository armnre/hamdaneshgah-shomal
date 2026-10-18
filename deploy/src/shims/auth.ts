// Frontend replacement for `zitejs/auth` on Netlify (magic-link session via /api/auth/*).
import { useSyncExternalStore } from 'react';

export type AuthUser = { id: string; email: string; name: string; firstName?: string; lastName?: string; emailVerified: boolean; image: string | null };
type State = { user: AuthUser | null; isLoading: boolean };

let state: State = { user: null, isLoading: true };
const listeners = new Set<() => void>();
let started = false;

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

async function load() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const { user } = await res.json();
    set({ user: user ? { name: user.email.split('@')[0], emailVerified: true, image: null, ...user } : null, isLoading: false });
  } catch {
    set({ user: null, isLoading: false });
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!started) { started = true; load(); }
  return () => listeners.delete(l);
}

export function useAuth() {
  return useSyncExternalStore(subscribe, () => state);
}

export function loginWithRedirect(opts?: { redirectUrl?: string }) {
  const target = opts?.redirectUrl ?? window.location.pathname + window.location.search;
  window.location.href = target.startsWith("/admin") ? target : "/admin";
}

export async function logout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  window.location.href = '/';
}

export async function updateProfile(_: { name?: string; firstName?: string; lastName?: string }) {
  throw new Error('Profile editing is not available');
}
