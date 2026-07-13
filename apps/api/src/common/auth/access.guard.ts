import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../modules/prisma/prisma.service';
import {
  IS_PUBLIC_KEY,
  REQUIRED_PERMISSIONS_KEY,
  RequestUser,
} from './auth.decorators';
import { resolvePermissions, userHasPermission } from './permissions';
import { extractBearerToken, verifyToken } from './token';

/**
 * Guard global: ningún endpoint responde sin token válido salvo que esté
 * marcado con @Public(). Si además declara @RequirePermissions(...), exige
 * al menos uno de esos permisos.
 *
 * Los permisos se releen de la base en cada request (no se confía en los del
 * token) para que revocar un permiso tenga efecto inmediato, sin esperar a
 * que expire la sesión.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const payload = verifyToken(
      extractBearerToken(request.headers?.authorization),
    );

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      include: { permissions: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    const requestUser: RequestUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      memberId: user.memberId,
      permissions: resolvePermissions(user.role, user.permissions),
    };

    request.user = requestUser;

    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const allowed = required.some((permission) =>
      userHasPermission(requestUser, permission),
    );

    if (!allowed) {
      throw new ForbiddenException(
        'No tenés permiso para acceder a este recurso.',
      );
    }

    return true;
  }
}
