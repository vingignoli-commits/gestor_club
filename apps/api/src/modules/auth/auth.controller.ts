import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  refresh() {
    return this.authService.refresh();
  }

  @Post('logout')
  logout() {
    return { success: true };
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.me(authorization);
  }

  @Post('recover-admin')
  recoverAdmin(
    @Body()
    dto: {
      email: string;
      fullName?: string;
      newPassword: string;
      recoveryKey: string;
    },
  ) {
    return this.authService.recoverAdmin(dto);
  }

  @Post('users/socio')
  createSocioUser(
    @Body()
    dto: {
      email: string;
      fullName: string;
      password: string;
    },
  ) {
    return this.authService.createSocioUser(dto);
  }
}
