import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/auth.decorators';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @RequirePermissions('contacts:read')
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.contactsService.findAll(search, includeInactive === 'true');
  }
}
