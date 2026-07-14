import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PaymentStatus, UserRole } from "@prisma/client";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import {
  buildCurrentRatesMap,
  buildDebtSnapshot,
} from "../members/member-debt.utils";
import {
  ALL_PERMISSIONS,
  SOCIO_DEFAULT_PERMISSIONS,
  resolvePermissions,
} from "../../common/auth/permissions";
import { signToken } from "../../common/auth/token";

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  memberId: string | null;
};

type CreateUserDto = {
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
  memberId?: string | null;
  permissions?: string[];
};

type UpdateUserDto = {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  memberId?: string | null;
  permissions?: string[];
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

/**
 * Contraseña que el alta masiva le asigna a todos los accesos nuevos. Es
 * compartida y conocida: a quien siga usándola se le exige cambiarla.
 */
const DEFAULT_SHARED_PASSWORD = "progreso";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { permissions: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Usuario o contraseña incorrectos");
    }

    if (
      user.passwordHash === "TEMP_PASSWORD_CHANGE_REQUIRED" ||
      user.passwordSalt === "TEMP_PASSWORD_CHANGE_REQUIRED"
    ) {
      throw new UnauthorizedException(
        "El usuario requiere definir una contraseña antes de ingresar.",
      );
    }

    const validPassword = this.verifyPassword(
      dto.password,
      user.passwordSalt,
      user.passwordHash,
    );

    if (!validPassword) {
      throw new UnauthorizedException("Usuario o contraseña incorrectos");
    }

    // Los accesos del alta masiva anteriores a este cambio no quedaron
    // marcados en la base, y desde ahí no hay forma de distinguirlos. Acá sí:
    // el login es el único punto donde vemos la contraseña en claro.
    const usesSharedPassword = dto.password === DEFAULT_SHARED_PASSWORD;
    const mustChangePassword = user.mustChangePassword || usesSharedPassword;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        ...(mustChangePassword !== user.mustChangePassword
          ? { mustChangePassword }
          : {}),
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      memberId: user.memberId,
    };

    const accessToken = signToken(authUser);

    return {
      accessToken,
      token: accessToken,
      user: this.publicUser(
        authUser,
        user.isActive,
        user.permissions,
        mustChangePassword,
      ),
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Sesión inválida.");
    }

    return this.publicUser(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        memberId: user.memberId,
      },
      user.isActive,
      user.permissions,
      user.mustChangePassword,
    );
  }

  async myProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { permissions: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Sesión inválida.");
    }

    if (!user.memberId) {
      throw new BadRequestException(
        "Tu usuario todavía no está vinculado a un socio del Cuadro.",
      );
    }

    const today = new Date();

    const [member, rates] = await Promise.all([
      this.prisma.member.findUnique({
        where: { id: user.memberId },
        include: {
          payments: {
            where: { status: PaymentStatus.REGISTERED },
            orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
            take: 12,
          },
          statusHistory: {
            orderBy: { effectiveFrom: "desc" },
          },
          categoryHistory: {
            orderBy: { effectiveFrom: "desc" },
          },
        },
      }),
      this.prisma.monthlyRate.findMany({
        where: {
          validFrom: { lte: today },
          OR: [{ validTo: null }, { validTo: { gt: today } }],
        },
        orderBy: [{ category: "asc" }, { validFrom: "desc" }],
      }),
    ]);

    if (!member) {
      throw new NotFoundException("Socio vinculado no encontrado.");
    }

    const currentRates = buildCurrentRatesMap(rates, today);
    const debt = buildDebtSnapshot(member, currentRates, today);
    const currentRate = currentRates.get(member.category) ?? 0;

    return {
      member: {
        id: member.id,
        matricula: member.matricula,
        firstName: member.firstName,
        lastName: member.lastName,
        fullName: `${member.lastName}, ${member.firstName}`,
        category: member.category,
        status: member.status,
        grade: member.grade,
        phone: member.phone,
        email: member.email,
        notes: member.notes,
        documentNumber: member.documentNumber,
        joinedAt: member.joinedAt,
        initiationDate: member.initiationDate,
        fellowcraftDate: member.fellowcraftDate,
        masterDate: member.masterDate,
        birthDate: member.birthDate,
        seniorityYears: this.calculateYears(member.initiationDate, today),
      },
      account: {
        currentRate,
        debt,
        lastPayments: member.payments.map((payment) => ({
          id: payment.id,
          paidAt: payment.paidAt,
          periodYear: payment.periodYear,
          periodMonth: payment.periodMonth,
          amount: Number(payment.amount),
          methodCode: payment.methodCode,
          receiptUrl: payment.receiptUrl,
          receiptNote: payment.receiptNote,
        })),
      },
      history: {
        status: member.statusHistory,
        category: member.categoryHistory,
      },
    };
  }

  async recoverAdmin(dto: RecoverAdminDto) {
    const recoveryKey = process.env.ADMIN_RECOVERY_KEY;

    if (!recoveryKey) {
      throw new BadRequestException("ADMIN_RECOVERY_KEY no está configurada.");
    }

    if (dto.recoveryKey !== recoveryKey) {
      throw new UnauthorizedException("Clave de recuperación inválida.");
    }

    const password = (dto.password ?? dto.newPassword ?? "").trim();

    if (!this.isStrongEnoughPassword(password)) {
      throw new BadRequestException(
        "La contraseña debe tener al menos 8 caracteres.",
      );
    }

    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { permissions: true },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      throw new NotFoundException("Administrador no encontrado.");
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
      include: { permissions: true },
    });

    return this.publicUser(
      {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.role,
        memberId: updated.memberId,
      },
      updated.isActive,
      updated.permissions,
    );
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      include: {
        member: {
          select: {
            id: true,
            matricula: true,
            firstName: true,
            lastName: true,
          },
        },
        permissions: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      memberId: user.memberId,
      member: user.member,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions: this.permissionsForUser(user.role, user.permissions),
    }));
  }

  async listMembersForUserLinking() {
    return this.prisma.member.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        matricula: true,
        firstName: true,
        lastName: true,
        category: true,
        status: true,
        grade: true,
        email: true,
      },
    });
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    const password = dto.password.trim();

    if (!email || !fullName) {
      throw new BadRequestException(
        "Email y nombre completo son obligatorios.",
      );
    }

    if (!this.isStrongEnoughPassword(password)) {
      throw new BadRequestException(
        "La contraseña debe tener al menos 8 caracteres.",
      );
    }

    if (![UserRole.ADMIN, UserRole.SOCIO].includes(dto.role)) {
      throw new BadRequestException("Rol inválido.");
    }

    if (dto.role === UserRole.SOCIO && !dto.memberId) {
      throw new BadRequestException(
        "El usuario socio debe estar vinculado a un H.·.",
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new BadRequestException("Ya existe un usuario con ese email.");
    }

    if (dto.memberId) {
      await this.ensureMemberCanBeLinked(dto.memberId);
    }

    const passwordData = this.hashPassword(password);

    const created = await this.prisma.user.create({
      data: {
        email,
        fullName,
        role: dto.role,
        memberId: dto.memberId || null,
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        isActive: true,
      },
    });

    await this.replaceUserPermissions(created.id, dto.permissions ?? []);
    return this.getPublicSystemUser(created.id);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado.");
    }

    if (dto.role && ![UserRole.ADMIN, UserRole.SOCIO].includes(dto.role)) {
      throw new BadRequestException("Rol inválido.");
    }

    const nextRole = dto.role ?? user.role;
    const nextMemberId =
      dto.memberId === undefined ? user.memberId : dto.memberId;

    if (nextRole === UserRole.SOCIO && !nextMemberId) {
      throw new BadRequestException(
        "El usuario socio debe estar vinculado a un H.·.",
      );
    }

    if (nextMemberId && nextMemberId !== user.memberId) {
      await this.ensureMemberCanBeLinked(nextMemberId, id);
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        role: dto.role,
        memberId: nextMemberId || null,
        isActive: dto.isActive,
        updatedAt: new Date(),
      },
    });

    if (dto.permissions) {
      await this.replaceUserPermissions(id, dto.permissions);
    }

    return this.getPublicSystemUser(id);
  }

  async updateUserPermissions(id: string, permissions: string[]) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado.");
    }

    await this.replaceUserPermissions(id, permissions);
    return this.getPublicSystemUser(id);
  }

  async createMemberAccesses() {
    const members = await this.prisma.member.findMany({
      where: {
        email: { not: null },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    let created = 0;
    let skippedWithoutEmail = 0;
    let skippedExistingEmail = 0;
    let skippedLinkedMember = 0;

    for (const member of members) {
      const email = member.email?.trim().toLowerCase();

      if (!email) {
        skippedWithoutEmail += 1;
        continue;
      }

      const [existingEmail, existingMemberLink] = await Promise.all([
        this.prisma.user.findUnique({ where: { email } }),
        this.prisma.user.findUnique({ where: { memberId: member.id } }),
      ]);

      if (existingEmail) {
        skippedExistingEmail += 1;
        continue;
      }

      if (existingMemberLink) {
        skippedLinkedMember += 1;
        continue;
      }

      const passwordData = this.hashPassword(DEFAULT_SHARED_PASSWORD);
      const user = await this.prisma.user.create({
        data: {
          email,
          fullName: `${member.firstName} ${member.lastName}`.trim(),
          role: UserRole.SOCIO,
          memberId: member.id,
          passwordHash: passwordData.hash,
          passwordSalt: passwordData.salt,
          isActive: true,
          // Nace con la clave compartida: se le exige cambiarla al entrar.
          mustChangePassword: true,
        },
      });

      await this.replaceUserPermissions(user.id, SOCIO_DEFAULT_PERMISSIONS);
      created += 1;
    }

    return {
      created,
      skippedWithoutEmail,
      skippedExistingEmail,
      skippedLinkedMember,
      password: DEFAULT_SHARED_PASSWORD,
    };
  }

  /**
   * Cambio de contraseña por el propio usuario: exige conocer la actual, así
   * un token robado no alcanza para secuestrar la cuenta.
   */
  async changeOwnPassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Sesión inválida.");
    }

    const currentPassword = dto.currentPassword.trim();
    const newPassword = dto.newPassword.trim();

    const validPassword = this.verifyPassword(
      currentPassword,
      user.passwordSalt,
      user.passwordHash,
    );

    if (!validPassword) {
      throw new UnauthorizedException("La contraseña actual no es correcta.");
    }

    if (!this.isStrongEnoughPassword(newPassword)) {
      throw new BadRequestException(
        "La contraseña nueva debe tener al menos 8 caracteres.",
      );
    }

    if (newPassword === currentPassword) {
      throw new BadRequestException(
        "La contraseña nueva debe ser distinta de la actual.",
      );
    }

    const passwordData = this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        // La eligió el propio usuario: ya no hay nada que exigirle.
        mustChangePassword: false,
        updatedAt: new Date(),
      },
    });

    return { changed: true };
  }

  async resetUserPassword(id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado.");
    }

    const password = dto.password.trim();

    if (!this.isStrongEnoughPassword(password)) {
      throw new BadRequestException(
        "La contraseña debe tener al menos 8 caracteres.",
      );
    }

    const passwordData = this.hashPassword(password);

    await this.prisma.user.update({
      where: { id },
      data: {
        // La eligió un ADMIN, no el usuario: se le exige cambiarla al entrar.
        mustChangePassword: true,
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.salt,
        updatedAt: new Date(),
      },
    });

    return this.getPublicSystemUser(id);
  }

  private async ensureMemberCanBeLinked(
    memberId: string,
    currentUserId?: string,
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException("H.·. vinculado no encontrado.");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { memberId },
    });

    if (existingUser && existingUser.id !== currentUserId) {
      throw new BadRequestException(
        "Este H.·. ya está vinculado a otro usuario.",
      );
    }
  }

  private async getPublicSystemUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        member: {
          select: {
            id: true,
            matricula: true,
            firstName: true,
            lastName: true,
          },
        },
        permissions: true,
      },
    });

    if (!user) throw new NotFoundException("Usuario no encontrado.");

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      memberId: user.memberId,
      member: user.member,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions: this.permissionsForUser(user.role, user.permissions),
    };
  }

  private publicUser(
    user: AuthUser,
    isActive: boolean,
    permissionRows: Array<{ key: string; enabled: boolean }> = [],
    mustChangePassword = false,
  ) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      memberId: user.memberId,
      isActive,
      mustChangePassword,
      permissions: this.permissionsForUser(user.role, permissionRows),
    };
  }

  private permissionsForUser(
    role: UserRole,
    permissionRows: Array<{ key: string; enabled: boolean }> = [],
  ) {
    return resolvePermissions(role, permissionRows);
  }

  private async replaceUserPermissions(userId: string, permissions: string[]) {
    const cleanPermissions = new Set(
      permissions.filter((permission) =>
        ALL_PERMISSIONS.includes(
          permission as (typeof ALL_PERMISSIONS)[number],
        ),
      ),
    );

    await this.prisma.userPermission.deleteMany({ where: { userId } });

    await this.prisma.userPermission.createMany({
      data: ALL_PERMISSIONS.map((permission) => ({
        userId,
        key: permission,
        enabled: cleanPermissions.has(permission),
      })),
      skipDuplicates: true,
    });
  }

  private calculateYears(from: Date, to: Date) {
    let years = to.getUTCFullYear() - from.getUTCFullYear();
    const monthDiff = to.getUTCMonth() - from.getUTCMonth();
    const dayDiff = to.getUTCDate() - from.getUTCDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      years -= 1;
    }

    return Math.max(0, years);
  }

  private hashPassword(password: string) {
    const salt = randomBytes(24).toString("hex");
    const hash = createHmac("sha256", salt).update(password).digest("hex");

    return { salt, hash };
  }

  private verifyPassword(password: string, salt: string, expectedHash: string) {
    const hash = createHmac("sha256", salt).update(password).digest("hex");
    return this.safeCompare(hash, expectedHash);
  }

  private safeCompare(a: string, b: string) {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    if (aBuffer.length !== bBuffer.length) return false;

    return timingSafeEqual(aBuffer, bBuffer);
  }

  private isStrongEnoughPassword(password: string) {
    return typeof password === "string" && password.trim().length >= 8;
  }
}
