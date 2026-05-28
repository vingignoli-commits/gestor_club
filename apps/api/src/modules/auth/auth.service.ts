import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

type CreateUserDto = {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
};

type UpdateUserDto = {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
};

type ResetPasswordDto = {
  password: string;
};

type RecoverAdminDto = {
  email: string;
  recoveryKey: string;
  password?: string;
  newPassword?: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    if (
      user.passwordHash === 'TEMP_PASSWORD_CHANGE_REQUIRED' ||
      user.passwordSalt === 'TEMP_PASSWORD_CHANGE_REQUIRED'
    ) {
      throw new UnauthorizedException(
        'El usuario requiere definir una contraseña antes de ingresar.',
      );
    }

    const validPassword = this.verifyPassword(
      dto.password,
      user.passwordSalt,
      user.passwordHash,
    );

    if (!validPassword) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    return {
      token: this.signToken(authUser),
      user: authUser,
    };
  }

  async recoverAdmin(dto: RecoverAdminDto) {
    const recoveryKey = process.env.ADMIN_RECOVERY_KEY;

    if (!recoveryKey) {
      throw new BadRequestException('ADMIN_RECOVERY_KEY no está configurada.');
    }

    if (dto.recoveryKey !== recoveryKey) {
      throw new UnauthorizedException('Clave de recuperación inválida.');
    }

    const password = (dto.password ?? dto.newPassword ?? '').trim();

    if (!this.isStrongEnoughPassword(password)) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres.',
      );
    }

    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new NotFoundException('Administrador no encontrado.');
    }

    const passwordData = this.hashPassword(password);

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      role: updated.role,
      isActive: updated.isActive,
    };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();

    if (!email || !fullName) {
      throw new BadRequestException('Email y nombre completo son obligatorios.');
    }

    if (!this.isStrongEnoughPassword(dto.password)) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres.',
      );
    }

    if (![UserRole.ADMIN, UserRole.SOCIO].includes(dto.role)) {
      throw new BadRequestException('Rol inválido.');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new BadRequestException('Ya existe un usuario con ese email.');
    }

    const passwordData = this.hashPassword(dto.password);

    return this.prisma.user.create({
      data: {
        email,
        fullName,
        role: dto.role,
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (dto.role && ![UserRole.ADMIN, UserRole.SOCIO].includes(dto.role)) {
      throw new BadRequestException('Rol inválido.');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        role: dto.role,
        isActive: dto.isActive,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async resetUserPassword(id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (!this.isStrongEnoughPassword(dto.password)) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres.',
      );
    }

    const passwordData = this.hashPassword(dto.password);

    return this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  verifyToken(token: string) {
    const secret = this.getTokenSecret();
    const [payloadEncoded, signature] = token.split('.');

    if (!payloadEncoded || !signature) {
      throw new UnauthorizedException('Token inválido.');
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(payloadEncoded)
      .digest('base64url');

    const valid = this.safeCompare(signature, expectedSignature);

    if (!valid) {
      throw new UnauthorizedException('Token inválido.');
    }

    const payload = JSON.parse(
      Buffer.from(payloadEncoded, 'base64url').toString('utf8'),
    ) as AuthUser & { exp: number };

    if (payload.exp < Date.now()) {
      throw new UnauthorizedException('Sesión vencida.');
    }

    return {
      id: payload.id,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
  }

  private signToken(user: AuthUser) {
    const secret = this.getTokenSecret();
    const payload = {
      ...user,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    };

    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );

    const signature = createHmac('sha256', secret)
      .update(payloadEncoded)
      .digest('base64url');

    return `${payloadEncoded}.${signature}`;
  }

  private getTokenSecret() {
    const secret = process.env.AUTH_TOKEN_SECRET;

    if (!secret) {
      throw new BadRequestException('AUTH_TOKEN_SECRET no está configurada.');
    }

    return secret;
  }

  private hashPassword(password: string) {
    const salt = randomBytes(24).toString('hex');
    const hash = createHmac('sha256', salt).update(password).digest('hex');

    return { salt, hash };
  }

  private verifyPassword(password: string, salt: string, expectedHash: string) {
    const hash = createHmac('sha256', salt).update(password).digest('hex');
    return this.safeCompare(hash, expectedHash);
  }

  private safeCompare(a: string, b: string) {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) return false;

    return timingSafeEqual(aBuffer, bBuffer);
  }

  private isStrongEnoughPassword(password: string) {
    return typeof password === 'string' && password.trim().length >= 8;
  }
}
