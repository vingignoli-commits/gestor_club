'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { api } from '../lib/api';

type UserRole = 'ADMIN' | 'SOCIO';

type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  permissions: string[];
};

type LoginResponse = {
  accessToken?: string;
  token?: string;
  user: User;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  canEdit: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canAccess: (pathname: string) => boolean;
};

const AuthContext = createContext<AuthCtx | null>(null);

const ADMIN_PATHS = [
  '/',
  '/socios',
  '/tesoreria',
  '/caja',
  '/reportes',
  '/mensajeria',
  '/auditoria',
  '/configuracion',
];

const SOCIO_PATHS = ['/', '/socios'];

function normalizePath(pathname: string) {
  if (pathname === '/') return '/';
  return `/${pathname.split('/').filter(Boolean)[0] ?? ''}`;
}

function clearStoredAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      clearStoredAuth();
      setLoading(false);
      return;
    }

    api
      .get<User>('/auth/me')
      .then(setUser)
      .catch(() => {
        clearStoredAuth();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    const token = res.accessToken ?? res.token;

    if (!token) {
      throw new Error('El servidor no devolvió token de sesión.');
    }

    localStorage.setItem('accessToken', token);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(res.user);
  }

  function logout() {
    clearStoredAuth();
    setUser(null);
  }

  const canAccess = useCallback(
    (pathname: string) => {
      if (!user) return false;

      const base = normalizePath(pathname);

      if (user.role === 'ADMIN') return ADMIN_PATHS.includes(base);
      if (user.role === 'SOCIO') return SOCIO_PATHS.includes(base);

      return false;
    },
    [user],
  );

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      canEdit: user?.role === 'ADMIN',
      login,
      logout,
      canAccess,
    }),
    [user, loading, canAccess],
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
