import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const REQUIRED_PERMISSIONS_KEY = 'auth:requiredPermissions';

export type RequestUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  memberId: string | null;
  permissions: string[];
};

/** Endpoint accesible sin token (login, recuperación de admin). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Exige al menos uno de los permisos indicados (semántica OR).
 * Sin este decorador un endpoint solo requiere estar autenticado.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    return ctx.switchToHttp().getRequest().user as RequestUser;
  },
);
