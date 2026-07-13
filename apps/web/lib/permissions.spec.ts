import { describe, expect, it } from 'vitest';
import {
  canAccessPath,
  resolveLandingPath,
  type PermissionUser,
} from './permissions';

const admin: PermissionUser = { role: 'ADMIN', permissions: [] };

// Caso del bug: socio SIN 'dashboard:read'. Antes se lo redirigía a '/',
// ruta que tampoco podía ver, y la app renderizaba null (pantalla en blanco).
const socioSinDashboard: PermissionUser = {
  role: 'SOCIO',
  permissions: ['profile:own'],
};

const socioSinNada: PermissionUser = { role: 'SOCIO', permissions: [] };

describe('canAccessPath', () => {
  it('deja pasar al ADMIN a cualquier sección', () => {
    expect(canAccessPath(admin, '/')).toBe(true);
    expect(canAccessPath(admin, '/configuracion')).toBe(true);
  });

  it('bloquea el dashboard al socio sin dashboard:read', () => {
    expect(canAccessPath(socioSinDashboard, '/')).toBe(false);
  });

  it('permite las secciones concedidas, incluidas sub-rutas', () => {
    expect(canAccessPath(socioSinDashboard, '/mi-perfil')).toBe(true);
    expect(canAccessPath(socioSinDashboard, '/mi-perfil/editar')).toBe(true);
  });

  it('bloquea rutas desconocidas', () => {
    expect(canAccessPath(admin, '/ruta-inexistente')).toBe(false);
  });
});

describe('resolveLandingPath', () => {
  it('manda al ADMIN al dashboard', () => {
    expect(resolveLandingPath(admin)).toBe('/');
  });

  it('manda al socio sin dashboard:read a su primera sección permitida', () => {
    // Antes: se lo mandaba a '/' -> pantalla en blanco.
    expect(resolveLandingPath(socioSinDashboard)).toBe('/mi-perfil');
  });

  it('respeta el orden del menú cuando hay varias secciones permitidas', () => {
    const tesorero: PermissionUser = {
      role: 'SOCIO',
      permissions: ['reports:read', 'members:read', 'treasury:read'],
    };

    expect(resolveLandingPath(tesorero)).toBe('/socios');
  });

  it('devuelve null si el usuario no tiene ninguna sección (sin bucle de redirección)', () => {
    expect(resolveLandingPath(socioSinNada)).toBeNull();
  });

  it('devuelve null si no hay usuario', () => {
    expect(resolveLandingPath(null)).toBeNull();
  });
});
