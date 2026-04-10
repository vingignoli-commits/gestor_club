import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  async login(email: string, password: string) {
    if (!email || !password) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return {
      accessToken: 'dev-access-token',
      refreshToken: 'dev-refresh-token',
      user: {
        id: 'dev-user',
        email,
        fullName: 'Usuario Demo',
        roles: ['superadmin'],
      },
    };
  }

  refresh() {
    return {
      accessToken: 'dev-access-token-refreshed',
    };
  }

  me() {
    return {
      id: 'dev-user',
      email: 'admin@club.local',
      fullName: 'Administrador Demo',
      roles: ['superadmin'],
      permissions: [
        'members.read',
        'members.write',
        'payments.write',
        'reports.read',
        'audit.read',
        'whatsapp.send',
      ],
    };
  }
}
