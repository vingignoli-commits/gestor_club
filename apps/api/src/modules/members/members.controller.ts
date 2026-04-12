import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MembersService } from './members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.membersService.findAll(search);
  }

  @Post()
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Get('debts')
  getDebtSummary() {
    return this.membersService.getDebtSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Get(':id/account-statement')
  getAccountStatement(@Param('id') id: string) {
    return this.membersService.getAccountStatement(id);
  }
}
