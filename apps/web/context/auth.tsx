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
import {
  canAccessPath,
  hasPermission as checkPermission,
  resolveLandingPath,
} from '../lib/permissions';

type UserRole = 'ADMIN' | 'SOCIO';

type User = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  memberId: string | null;
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
  hasPermission: (permission: string) => boolean;
  landingPath: string | null;
};

const AuthContext = createContext<AuthCtx | null>(null);

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

  const hasPermission = useCallback(
    (permission: string) => checkPermission(user, permission),
    [user],
  );

  const canAccess = useCallback(
    (pathname: string) => canAccessPath(user, pathname),
    [user],
  );

  // Primera pantalla a la que el usuario tiene acceso real.
  // Es null cuando no tiene permiso para ninguna sección.
  const landingPath = useMemo(() => resolveLandingPath(user), [user]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      canEdit: hasPermission('members:write'),
      login,
      logout,
      canAccess,
      hasPermission,
      landingPath,
    }),
    [user, loading, canAccess, hasPermission, landingPath],
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
