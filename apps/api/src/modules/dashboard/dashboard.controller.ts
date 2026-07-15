import { Controller, Get } from '@nestjs/common';
import {
  CurrentUser,
  RequestUser,
  RequirePermissions,
} from '../../common/auth/auth.decorators';
import { userHasPermission } from '../../common/auth/permissions';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@RequirePermissions('dashboard:read')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('executive')
  getExecutive(@CurrentUser() user: RequestUser) {
    return this.dashboardService.getExecutiveDashboard({
      // El detalle nominal de deudores solo viaja si el usuario puede verlo.
      // Antes se enviaba a todos y el front se limitaba a ocultarlo.
      includeDebtorDetails: userHasPermission(user, 'debt:all'),
    });
  }

  // Tablero "Nuestro Taller" para socios: exige su propio permiso, no el del
  // dashboard ejecutivo (que queda para el admin).
  @Get('taller')
  @RequirePermissions('taller:read')
  getTaller() {
    return this.dashboardService.getTallerDashboard();
  }
}
