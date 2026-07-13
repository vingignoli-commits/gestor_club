import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/auth.decorators';
import { AuditService } from './audit.service';

@Controller('audit-logs')
@RequirePermissions('audit:read')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query('entityName') entityName?: string) {
    return this.auditService.list(entityName);
  }
}

