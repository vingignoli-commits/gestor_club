'use client';

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../lib/api';

export type AuthRole = 'ADMIN' | 'GENERAL';

type User = {
  id: string;
  email: string;
  fullName: string;
  role: AuthRole;
  roles: string[];
  permissions: string[];
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canAccess: (path: string) => boolean;
  canEdit: boolean;
};

const AuthContext = createContext<AuthCtx | null>(null);

const GENERAL_ALLOWED_PATHS = ['/', '/socios', '/caja', '/reportes'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get<User>('/auth/me')
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('accessToken');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{
      accessToken: string;
      user: User;
    }>('/auth/login', {
      email,
      password,
    });

    localStorage.setItem('accessToken', res.accessToken);
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem('accessToken');
    setUser(null);
  }

  function canAccess(path: string) {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return GENERAL_ALLOWED_PATHS.includes(path);
  }

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      login,
      logout,
      canAccess,
      canEdit: user?.role === 'ADMIN',
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}
