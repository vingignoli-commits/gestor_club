import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = this.verifyPassword(
      password,
      user.passwordSalt,
      user.passwordHash,
    );

    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: this.signToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
      }),
      user: this.publicUser(user),
    };
  }

  refresh() {
    return {
      success: false,
      message: 'Refresh token no implementado. Volvé a iniciar sesión.',
    };
  }

  async me(authorization?: string) {
    const payload = this.getPayloadFromAuthorization(authorization);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sesión inválida');
    }

    return this.publicUser(user);
  }

  async recoverAdmin(dto: {
    email: string;
    fullName?: string;
    newPassword: string;
    recoveryKey: string;
  }) {
    const configuredKey = process.env.ADMIN_RECOVERY_KEY;

    if (!configuredKey) {
      throw new BadRequestException(
        'ADMIN_RECOVERY_KEY no está configurada en el servidor.',
      );
    }

    if (dto.recoveryKey !== configuredKey) {
      throw new UnauthorizedException('Clave de recuperación inválida');
    }

    if (!dto.email || !dto.newPassword || dto.newPassword.length < 8) {
      throw new BadRequestException(
        'Email y nueva contraseña de al menos 8 caracteres son obligatorios.',
      );
    }

    const cleanEmail = dto.email.trim().toLowerCase();
    const { salt, hash } = this.hashPassword(dto.newPassword);

    const user = await this.prisma.user.upsert({
      where: { email: cleanEmail },
      create: {
        email: cleanEmail,
        fullName: dto.fullName?.trim() || 'Administrador',
        role: UserRole.ADMIN,
        passwordSalt: salt,
        passwordHash: hash,
        isActive: true,
      },
      update: {
        fullName: dto.fullName?.trim() || undefined,
        role: UserRole.ADMIN,
        passwordSalt: salt,
        passwordHash: hash,
        isActive: true,
      },
    });

    return {
      success: true,
      user: this.publicUser(user),
    };
  }

  async createSocioUser(dto: {
    email: string;
    fullName: string;
    password: string;
  }) {
    if (!dto.email || !dto.fullName || !dto.password || dto.password.length < 8) {
      throw new BadRequestException(
        'Email, nombre y contraseña de al menos 8 caracteres son obligatorios.',
      );
    }

    const cleanEmail = dto.email.trim().toLowerCase();
    const { salt, hash } = this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: cleanEmail,
        fullName: dto.fullName.trim(),
        role: UserRole.SOCIO,
        passwordSalt: salt,
        passwordHash: hash,
        isActive: true,
      },
    });

    return this.publicUser(user);
  }

  private publicUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      permissions:
        user.role === UserRole.ADMIN
          ? [
              'dashboard.read',
              'members.read',
              'members.write',
              'payments.read',
              'payments.write',
              'cash.read',
              'cash.write',
              'reports.read',
              'messages.read',
              'messages.write',
              'settings.write',
            ]
          : ['dashboard.read', 'members.read'],
    };
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');

    return { salt, hash };
  }

  private verifyPassword(password: string, salt: string, expectedHash: string) {
    const actual = Buffer.from(scryptSync(password, salt, 64).toString('hex'));
    const expected = Buffer.from(expectedHash);

    if (actual.length !== expected.length) return false;

    return timingSafeEqual(actual, expected);
  }

  private signToken(payload: TokenPayload) {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.tokenSecret())
      .update(encodedPayload)
      .digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  private verifyToken(token: string): TokenPayload {
    const [encodedPayload, signature] = token.split('.');

    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('Token inválido');
    }

    const expectedSignature = createHmac('sha256', this.tokenSecret())
      .update(encodedPayload)
      .digest('base64url');

    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('Token inválido');
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as TokenPayload;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token vencido');
    }

    return payload;
  }

  private getPayloadFromAuthorization(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token faltante');
    }

    return this.verifyToken(authorization.replace('Bearer ', '').trim());
  }

  private tokenSecret() {
    const secret = process.env.AUTH_TOKEN_SECRET;

    if (!secret) {
      throw new BadRequestException(
        'AUTH_TOKEN_SECRET no está configurado en el servidor.',
      );
    }

    return secret;
  }
}
