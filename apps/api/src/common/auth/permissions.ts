import { UserRole } from '@prisma/client';

export const ALL_PERMISSIONS = [
  'dashboard:read',
  'dashboard:full',
  'taller:read',
  'announcements:read',
  'announcements:write',
  'members:read',
  'members:write',
  'profile:own',
  'debt:own',
  'debt:all',
  'treasury:read',
  'treasury:write',
  'cash:read',
  'cash:write',
  'reports:read',
  'messaging:read',
  'messaging:write',
  'audit:read',
  'settings:read',
  'settings:write',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const ADMIN_PERMISSIONS: Permission[] = [...ALL_PERMISSIONS];

// El socio ve por defecto "Nuestro Taller" (taller:read) y sus avisos, pero NO
// el dashboard ejecutivo/financiero (dashboard:read), que queda para el admin.
export const SOCIO_DEFAULT_PERMISSIONS: Permission[] = [
  'taller:read',
  'announcements:read',
  'members:read',
  'profile:own',
  'debt:own',
];

export function isKnownPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Permisos efectivos de un usuario. Es la única fuente de verdad: la usan
 * tanto la respuesta de /auth/me como el guard que protege los endpoints,
 * para que el front y el back nunca discrepen.
 */
export function resolvePermissions(
  role: UserRole,
  permissionRows: Array<{ key: string; enabled: boolean }> = [],
): string[] {
  if (role === UserRole.ADMIN) return [...ADMIN_PERMISSIONS];

  const validRows = permissionRows.filter((row) => isKnownPermission(row.key));

  if (validRows.length === 0) {
    return [...SOCIO_DEFAULT_PERMISSIONS];
  }

  return validRows.filter((row) => row.enabled).map((row) => row.key);
}

export function userHasPermission(
  user: { role: UserRole; permissions: string[] } | null | undefined,
  permission: string,
): boolean {
  if (!user) return false;
  if (user.role === UserRole.ADMIN) return true;
  return user.permissions.includes(permission);
}
