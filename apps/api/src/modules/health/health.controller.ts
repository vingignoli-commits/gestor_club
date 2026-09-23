import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import {
  CurrentUser,
  RequestUser,
  RequirePermissions,
} from '../../common/auth/auth.decorators';
import { UpsertHealthDto } from './dto/upsert-health.dto';
import { HealthService } from './health.service';

/**
 * Ficha de emergencia. Hay dos puertas separadas a propósito:
 *
 *  - /health/me        el socio sobre su propia ficha, con 'profile:own'.
 *  - /health/members/* la ficha de un tercero, con 'health:read'/'health:write'.
 *
 * Mezclarlas en una sola ruta obligaría a decidir dentro del handler si el
 * memberId pedido es el propio, y ese es justo el tipo de chequeo que se
 * olvida al agregar un endpoint nuevo. Con dos rutas el permiso es evidente.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @RequirePermissions('profile:own')
  @Get('me')
  getMine(@CurrentUser() user: RequestUser) {
    return this.healthService.findByMemberId(requireMemberId(user));
  }

  @RequirePermissions('profile:own')
  @Put('me')
  updateMine(@CurrentUser() user: RequestUser, @Body() dto: UpsertHealthDto) {
    return this.healthService.upsert(requireMemberId(user), dto, user.id);
  }

  @RequirePermissions('health:read')
  @Get('members/:memberId')
  findOne(@Param('memberId') memberId: string) {
    return this.healthService.findByMemberId(memberId);
  }

  @RequirePermissions('health:write')
  @Put('members/:memberId')
  upsert(
    @Param('memberId') memberId: string,
    @Body() dto: UpsertHealthDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.healthService.upsert(memberId, dto, user.id);
  }
}

/**
 * Un ADMIN puede no tener socio vinculado: en ese caso no hay ficha propia que
 * mostrar, y conviene decirlo en vez de devolver un 404 de "socio no
 * encontrado" que sugiere que el socio fue borrado.
 */
function requireMemberId(user: RequestUser): string {
  if (!user.memberId) {
    throw new BadRequestException(
      'Tu usuario no está vinculado a un socio, así que no tiene ficha de emergencia propia.',
    );
  }

  return user.memberId;
}
