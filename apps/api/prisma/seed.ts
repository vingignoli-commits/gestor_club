import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Tarifas mensuales por categoria
  const rates = [
    { category: 'SIMPLE', amount: 5000 },
    { category: 'DOBLE', amount: 9000 },
    { category: 'ESTUDIANTE', amount: 3000 },
    { category: 'SOCIAL', amount: 4000 },
    { category: 'MENOR', amount: 2500 },
    { category: 'HONOR', amount: 0 },
  ];

  for (const rate of rates) {
    await prisma.monthlyRate.upsert({
      where: { id: `rate-${rate.category}` },
      update: { amount: rate.amount },
      create: {
        id: `rate-${rate.category}`,
        category: rate.category as any,
        amount: rate.amount,
        validFrom: new Date('2026-01-01'),
      },
    });
  }

  // Periodo actual
  const period = await prisma.billingPeriod.upsert({
    where: { code: '2026-04' },
    update: {},
    create: {
      code: '2026-04',
      label: 'Abril 2026',
      periodYear: 2026,
      periodMonth: 4,
      dueDate: new Date('2026-04-10'),
    },
  });

  // Socios de prueba
  const members = [
    { matricula: '001', firstName: 'Juan', lastName: 'Perez', category: 'SIMPLE', grade: '1ro', phone: '+5493510000001', email: 'juan@example.com' },
    { matricula: '002', firstName: 'Ana', lastName: 'Gomez', category: 'DOBLE', grade: '2do', phone: '+5493510000002', email: 'ana@example.com' },
    { matricula: '003', firstName: 'Carlos', lastName: 'Lopez', category: 'ESTUDIANTE', grade: '3ro', phone: '+5493510000003', email: 'carlos@example.com' },
  ];

  for (const m of members) {
    await prisma.member.upsert({
      where: { matricula: m.matricula },
      update: {},
      create: {
        ...m,
        category: m.category as any,
        status: 'ACTIVE',
        joinedAt: new Date('2026-01-01'),
      },
    });
  }

  // Templates WhatsApp
  await prisma.whatsappTemplate.upsert({
    where: { code: 'VENCIMIENTO_CUOTA' },
    update: {},
    create: {
      code: 'VENCIMIENTO_CUOTA',
      name: 'Recordatorio vencimiento',
      body: 'Hola {{nombre}}, te recordamos que tu cuota de {{mes}} vence el {{fecha}}. Monto: ${{monto}}.',
    },
  });

  await prisma.whatsappTemplate.upsert({
    where: { code: 'AVISO_DEUDA' },
    update: {},
    create: {
      code: 'AVISO_DEUDA',
      name: 'Aviso de deuda',
      body: 'Hola {{nombre}}, tenes una deuda pendiente de ${{monto}}. Por favor regulariza tu situacion.',
    },
  });

  console.log('Seed completado');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
