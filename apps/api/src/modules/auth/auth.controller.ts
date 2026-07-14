import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  CurrentUser,
  Public,
  RequestUser,
  RequirePermissions,
} from '../../common/auth/auth.decorators';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.id);
  }

  @Get('me/profile')
  myProfile(@CurrentUser() user: RequestUser) {
    return this.authService.myProfile(user.id);
  }

  // Sin @RequirePermissions: cualquier usuario autenticado puede cambiar su
  // propia contraseña. Siempre opera sobre el id del token, nunca sobre uno
  // recibido por parámetro.
  @Post('me/password')
  changeOwnPassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changeOwnPassword(user.id, dto);
  }

  @Public()
  @Post('recover-admin')
  recoverAdmin(
    @Body()
    dto: {
      email: string;
      recoveryKey: string;
      password?: string;
      newPassword?: string;
    },
  ) {
    return this.authService.recoverAdmin(dto);
  }

  @RequirePermissions('settings:read')
  @Get('users')
  listUsers() {
    return this.authService.listUsers();
  }

  @RequirePermissions('settings:read')
  @Get('users/member-options')
  listMembersForUserLinking() {
    return this.authService.listMembersForUserLinking();
  }

  @RequirePermissions('settings:write')
  @Post('users/create-member-accesses')
  createMemberAccesses() {
    return this.authService.createMemberAccesses();
  }

  @RequirePermissions('settings:write')
  @Post('users')
  createUser(
    @Body()
    dto: {
      email: string;
      fullName: string;
      role: UserRole;
      password: string;
      memberId?: string | null;
      permissions?: string[];
    },
  ) {
    return this.authService.createUser(dto);
  }

  @RequirePermissions('settings:write')
  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body()
    dto: {
      fullName?: string;
      role?: UserRole;
      isActive?: boolean;
      memberId?: string | null;
      permissions?: string[];
    },
  ) {
    return this.authService.updateUser(id, dto);
  }

  @RequirePermissions('settings:write')
  @Post('users/:id/permissions')
  updateUserPermissions(
    @Param('id') id: string,
    @Body()
    dto: {
      permissions: string[];
    },
  ) {
    return this.authService.updateUserPermissions(id, dto.permissions ?? []);
  }

  @RequirePermissions('settings:write')
  @Post('users/:id/reset-password')
  resetUserPassword(
    @Param('id') id: string,
    @Body()
    dto: {
      password: string;
    },
  ) {
    return this.authService.resetUserPassword(id, dto);
  }
}
