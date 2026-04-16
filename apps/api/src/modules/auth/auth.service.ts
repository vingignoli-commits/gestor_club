import { Injectable, UnauthorizedException } from '@nestjs/common';

type AuthRole = 'ADMIN' | 'GENERAL';

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: AuthRole;
  roles: string[];
  permissions: string[];
};

const USERS: Array<{
  email: string;
  password: string;
  user: AuthUser;
}> = [
  {
    email: 'admin@progreso100.local',
    password: 'admin123',
    user: {
      id: 'admin-progreso-100',
      email: 'admin@progreso100.local',
      fullName: 'Administrador General',
      role: 'ADMIN',
      roles: ['admin'],
      permissions: ['*'],
    },
  },
  {
    email: 'usuario@progreso100.local',
    password: 'usuario123',
    user: {
      id: 'general-progreso-100',
      email: 'usuario@progreso100.local',
      fullName: 'Usuario General',
      role: 'GENERAL',
      roles: ['general'],
      permissions: [
        'dashboard.read',
        'members.read',
        'cash.read',
        'reports.read',
      ],
    },
  },
];

@Injectable()
export class AuthService {
  async login(email: string, password: string) {
    const record = USERS.find(
      (item) =>
        item.email.toLowerCase() === email.trim().toLowerCase() &&
        item.password === password,
    );

    if (!record) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      accessToken: this.buildToken(record.user),
      refreshToken: `refresh:${record.user.role}:${record.user.email}`,
      user: record.user,
    };
  }

  refresh() {
    return {
      accessToken: 'dev-access-token-refreshed',
    };
  }

  me(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      throw new UnauthorizedException('Sesión inválida');
    }

    const user = this.parseToken(token);

    if (!user) {
      throw new UnauthorizedException('Sesión inválida');
    }

    return user;
  }

  private buildToken(user: AuthUser) {
    const encodedEmail = Buffer.from(user.email, 'utf8').toString('base64url');
    return `mock:${user.role}:${encodedEmail}`;
  }

  private parseToken(token: string): AuthUser | null {
    const [prefix, role, encodedEmail] = token.split(':');

    if (prefix !== 'mock' || !role || !encodedEmail) {
      return null;
    }

    const email = Buffer.from(encodedEmail, 'base64url').toString('utf8');

    const record = USERS.find(
      (item) =>
        item.email.toLowerCase() === email.toLowerCase() &&
        item.user.role === role,
    );

    return record?.user ?? null;
  }
}
