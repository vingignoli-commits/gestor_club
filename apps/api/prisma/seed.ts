import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const activeCategory = await prisma.memberCategory.upsert({
    where: { code: 'ACTIVO' },
    update: {},
    create: {
      code: 'ACTIVO',
      name: 'Socio Activo',
    },
  });

  const familyCategory = await prisma.memberCategory.upsert({
    where: { code: 'FAMILIAR' },
    update: {},
    create: {
      code: 'FAMILIAR',
      name: 'Grupo Familiar',
    },
  });

  await prisma.whatsappTemplate.upsert({
    where: { code: 'RECORDATORIO_MORA' },
    update: {},
    create: {
      code: 'RECORDATORIO_MORA',
      name: 'Recordatorio de mora',
      body: 'Hola {{nombre}} {{apellido}}, te contactamos desde el club por tu estado de cuenta pendiente.',
    },
  });

  await prisma.membershipPlan.upsert({
    where: { code: 'CUOTA_ACTIVO' },
    update: {},
    create: {
      code: 'CUOTA_ACTIVO',
      name: 'Cuota socio activo',
      frequency: 'MONTHLY',
      prices: {
        create: {
          amount: 15000,
          validFrom: new Date('2026-01-01'),
        },
      },
    },
  });

  const period = await prisma.billingPeriod.upsert({
    where: { code: '2026-03' },
    update: {},
    create: {
      code: '2026-03',
      label: 'Marzo 2026',
      periodYear: 2026,
      periodMonth: 3,
      dueDate: new Date('2026-03-10'),
    },
  });

  const member = await prisma.member.upsert({
    where: { documentNumber: '30111222' },
    update: {},
    create: {
      firstName: 'Juan',
      lastName: 'Perez',
      documentNumber: '30111222',
      email: 'juan.perez@example.com',
      phone: '+5493510000000',
      joinedAt: new Date('2026-01-05'),
      currentStatusCode: 'ACTIVE',
      memberType: 'TITULAR',
      categoryId: activeCategory.id,
      statusHistory: {
        create: {
          statusCode: 'ACTIVE',
          effectiveFrom: new Date('2026-01-05'),
          reason: 'Alta inicial',
        },
      },
      categoryHistory: {
        create: {
          categoryId: activeCategory.id,
          effectiveFrom: new Date('2026-01-05'),
          reason: 'Alta inicial',
        },
      },
    },
  });

  await prisma.member.upsert({
    where: { documentNumber: '28999111' },
    update: {},
    create: {
      firstName: 'Ana',
      lastName: 'Gomez',
      documentNumber: '28999111',
      email: 'ana.gomez@example.com',
      phone: '+5493511111111',
      joinedAt: new Date('2026-02-01'),
      currentStatusCode: 'ACTIVE',
      memberType: 'ADHERENTE',
      categoryId: familyCategory.id,
      statusHistory: {
        create: {
          statusCode: 'ACTIVE',
          effectiveFrom: new Date('2026-02-01'),
        },
      },
      categoryHistory: {
        create: {
          categoryId: familyCategory.id,
          effectiveFrom: new Date('2026-02-01'),
        },
      },
    },
  });

  await prisma.charge.upsert({
    where: {
      memberId_billingPeriodId: {
        memberId: member.id,
        billingPeriodId: period.id,
      },
    },
    update: {},
    create: {
      memberId: member.id,
      billingPeriodId: period.id,
      amount: 15000,
      dueDate: new Date('2026-03-10'),
      status: 'PENDING',
      description: 'Cuota Marzo 2026',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

