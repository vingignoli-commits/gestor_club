import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/auth.decorators';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

// El padrón lo consultan tres pantallas: Cuadro, Tesorería y Mensajería.
// Cualquiera de esos permisos habilita la lectura.
const CAN_READ_MEMBERS = [
  'members:read',
  'treasury:read',
  'messaging:read',
] as const;

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @RequirePermissions(...CAN_READ_MEMBERS)
  @Get()
  findAll(@Query('search') search?: string) {
    return this.membersService.findAll(search);
  }

  @RequirePermissions('members:write')
  @Post()
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @RequirePermissions('debt:all', 'treasury:read')
  @Get('debts')
  getDebtSummary() {
    return this.membersService.getDebtSummary();
  }

  @RequirePermissions(...CAN_READ_MEMBERS)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @RequirePermissions('members:write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @RequirePermissions(...CAN_READ_MEMBERS)
  @Get(':id/account-statement')
  getAccountStatement(@Param('id') id: string) {
    return this.membersService.getAccountStatement(id);
  }
}
