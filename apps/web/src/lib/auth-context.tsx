/* eslint-disable react-refresh/only-export-components */
import * as React from 'react';

import { apiFetch, getToken, setToken } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (input: {
    displayName?: string;
    avatarUrl?: string;
  }) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(() => getToken() !== null);

  React.useEffect(() => {
    if (!getToken()) {
      return;
    }

    apiFetch<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const response = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const register = React.useCallback(
    async (email: string, password: string, displayName?: string) => {
      const response = await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      setToken(response.accessToken);
      setUser(response.user);
    },
    []
  );

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = React.useCallback(
    async (input: { displayName?: string; avatarUrl?: string }) => {
      const updated = await apiFetch<AuthUser>('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      setUser(updated);
    },
    []
  );

  const deleteAccount = React.useCallback(async () => {
    await apiFetch<void>('/auth/me', { method: 'DELETE' });
    setToken(null);
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({
      user,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      deleteAccount,
    }),
    [user, isLoading, login, register, logout, updateProfile, deleteAccount]
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
