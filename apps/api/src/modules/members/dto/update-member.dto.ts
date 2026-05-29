import { MemberCategory, MemberStatus } from '@prisma/client';

export class UpdateMemberDto {
  matricula?: string;
  documentNumber?: string;

  firstName?: string;
  lastName?: string;

  category?: MemberCategory;
  status?: MemberStatus;
  grade?: string | null;

  phone?: string;
  email?: string;
  notes?: string;

  joinedAt?: string;
  birthDate?: string;

  initiationDate?: string;
  fellowcraftDate?: string;
  masterDate?: string;
}
