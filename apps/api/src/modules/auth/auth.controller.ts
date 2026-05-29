import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.me(authorization);
  }

  @Get('me/profile')
  myProfile(@Headers('authorization') authorization?: string) {
    return this.authService.myProfile(authorization);
  }

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

  @Get('users')
  listUsers() {
    return this.authService.listUsers();
  }

  @Get('users/member-options')
  listMembersForUserLinking() {
    return this.authService.listMembersForUserLinking();
  }

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
