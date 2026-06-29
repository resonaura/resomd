/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';

import { AUTH_WEB_URL, apiFetch } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (redirectPath?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // On mount, check if the user is logged in via the shared session cookie.
  // The resomd API reads the `rsnra_session` cookie (shared across localhost
  // ports in dev, .rsnra.com in prod) and verifies the JWT with the same
  // JWT_SECRET as the auth service.
  React.useEffect(() => {
    let cancelled = false;
    apiFetch<AuthUser>('/auth/me')
      .then(data => {
        if (cancelled) return;
        setUser(data);
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = React.useCallback((redirectPath?: string) => {
    const target =
      redirectPath ?? window.location.pathname + window.location.search;
    const redirectUrl = `${window.location.origin}${target}`;
    window.location.href = `${AUTH_WEB_URL}/auth?redirect=${encodeURIComponent(
      redirectUrl
    )}&client_id=resomd`;
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' });
    } catch {
      // Even if the network call fails, clear local state.
    }
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ user, isLoading, signIn, logout }),
    [user, isLoading, signIn, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
