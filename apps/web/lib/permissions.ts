export type PermissionUser = {
  role: 'ADMIN' | 'SOCIO';
  permissions: string[];
};

export const PATH_PERMISSIONS: Record<string, string> = {
  '/': 'dashboard:read',
  '/socios': 'members:read',
  '/mi-perfil': 'profile:own',
  '/tesoreria': 'treasury:read',
  '/caja': 'cash:read',
  '/reportes': 'reports:read',
  '/mensajeria': 'messaging:read',
  '/auditoria': 'audit:read',
  '/configuracion': 'settings:read',
};

// Orden de preferencia para elegir la pantalla inicial de un usuario.
// Coincide con el orden del menú lateral.
export const LANDING_PRIORITY = [
  '/',
  '/socios',
  '/mi-perfil',
  '/tesoreria',
  '/caja',
  '/reportes',
  '/mensajeria',
  '/auditoria',
  '/configuracion',
];

export function normalizePath(pathname: string) {
  if (pathname === '/') return '/';
  return `/${pathname.split('/').filter(Boolean)[0] ?? ''}`;
}

export function hasPermission(
  user: PermissionUser | null,
  permission: string,
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.permissions.includes(permission);
}

export function canAccessPath(
  user: PermissionUser | null,
  pathname: string,
): boolean {
  if (!user) return false;

  const permission = PATH_PERMISSIONS[normalizePath(pathname)];

  if (!permission) return false;

  return hasPermission(user, permission);
}

/**
 * Primera pantalla a la que el usuario tiene acceso real.
 * Devuelve null cuando no puede ver ninguna sección; en ese caso NO hay que
 * redirigir (redirigir a '/' a ciegas dejaba la pantalla en blanco a los
 * usuarios sin 'dashboard:read').
 */
export function resolveLandingPath(user: PermissionUser | null): string | null {
  if (!user) return null;

  return LANDING_PRIORITY.find((path) => canAccessPath(user, path)) ?? null;
}
