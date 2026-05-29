import { PrismaClient, MemberCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultJoinedAt = new Date('2024-01-01T00:00:00.000Z');
  const defaultInitiationDate = new Date('2024-01-01T00:00:00.000Z');

  const members = [
    {
      matricula: '001',
      firstName: 'Juan',
      lastName: 'Pérez',
      grade: 'APRENDIZ',
      phone: '',
      email: '',
      category: MemberCategory.SIMPLE,
    },
  ];

  for (const member of members) {
    await prisma.member.upsert({
      where: {
        matricula: member.matricula,
      },
      update: {
        firstName: member.firstName,
        lastName: member.lastName,
        grade: member.grade,
        phone: member.phone,
        email: member.email,
        category: member.category,
        status: 'ACTIVE',
        joinedAt: defaultJoinedAt,
        initiationDate: defaultInitiationDate,
      },
      create: {
        matricula: member.matricula,
        firstName: member.firstName,
        lastName: member.lastName,
        grade: member.grade,
        phone: member.phone,
        email: member.email,
        category: member.category,
        status: 'ACTIVE',
        joinedAt: defaultJoinedAt,
        initiationDate: defaultInitiationDate,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
}
