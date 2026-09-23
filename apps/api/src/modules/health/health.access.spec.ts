import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { signToken } from '../../common/auth/token';
import { PrismaService } from '../prisma/prisma.service';
import { SOCIO_DEFAULT_PERMISSIONS } from '../../common/auth/permissions';

process.env.AUTH_TOKEN_SECRET = 'test-secret';

type FakeUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  memberId: string | null;
  isActive: boolean;
  permissions: Array<{ key: string; enabled: boolean }>;
};

const rows = (keys: string[]) => keys.map((key) => ({ key, enabled: true }));

const admin: FakeUser = {
  id: 'admin-1',
  email: 'admin@club.test',
  fullName: 'Admin',
  role: UserRole.ADMIN,
  memberId: null,
  isActive: true,
  permissions: [],
};

// Socio común: tiene lo que otorga SOCIO_DEFAULT_PERMISSIONS y nada más.
const socio: FakeUser = {
  id: 'socio-1',
  email: 'socio@club.test',
  fullName: 'Socio Comun',
  role: UserRole.SOCIO,
  memberId: 'member-1',
  isActive: true,
  permissions: rows([...SOCIO_DEFAULT_PERMISSIONS]),
};

// Socio con la ficha de emergencia habilitada (ej. el Hospitalario).
const socioConSalud: FakeUser = {
  id: 'socio-2',
  email: 'hospitalario@club.test',
  fullName: 'Socio Con Salud',
  role: UserRole.SOCIO,
  memberId: 'member-2',
  isActive: true,
  permissions: rows([...SOCIO_DEFAULT_PERMISSIONS, 'health:read']),
};

const USERS = [admin, socio, socioConSalud];

const tokenFor = (user: FakeUser) =>
  signToken({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    memberId: user.memberId,
  });

describe('Ficha de emergencia: quién accede a qué', () => {
  let app: INestApplication;

  const memberFindUnique = vi.fn().mockResolvedValue({
    id: 'member-1',
    matricula: '1001',
    firstName: 'Juan',
    lastName: 'Perez',
    birthDate: null,
    phone: '+54 9 341 555-0000',
    alternatePhone: null,
    emergencyContactName: 'Maria Perez',
    emergencyContactRelationship: 'Cónyuge',
    emergencyContactPhone: '+54 9 341 555-1111',
    health: { bloodType: 'O_POS', allergies: 'Penicilina' },
  });

  const memberFindMany = vi.fn().mockResolvedValue([]);

  const prismaMock = {
    user: {
      findUnique: vi.fn(({ where }: { where: { id?: string; email?: string } }) =>
        Promise.resolve(
          USERS.find((u) => u.id === where.id || u.email === where.email) ?? null,
        ),
      ),
      update: vi.fn().mockResolvedValue(admin),
    },
    member: { findUnique: memberFindUnique, findMany: memberFindMany },
    memberHealth: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ memberId: 'member-1', allergies: 'Polen' }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $on: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('sin token no se llega a la ficha de nadie', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/members/member-1')
      .expect(401);
  });

  // El motivo de que la ficha viva en tabla aparte: 'members:read' es permiso
  // por defecto de todo socio, así que si los datos de salud fueran columnas
  // de Member, este caso daría 200 con el grupo sanguíneo de todo el padrón.
  it('un socio común no puede ver la ficha de otro', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/members/member-2')
      .set('Authorization', `Bearer ${tokenFor(socio)}`)
      .expect(403);
  });

  it('un socio común tampoco puede escribir la ficha de otro', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/health/members/member-2')
      .set('Authorization', `Bearer ${tokenFor(socio)}`)
      .send({ allergies: 'Polen' })
      .expect(403);
  });

  it('con health:read sí puede leer la ficha de otro', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/members/member-1')
      .set('Authorization', `Bearer ${tokenFor(socioConSalud)}`)
      .expect(200);
  });

  // health:read habilita a leer, no a modificar: son permisos distintos.
  it('health:read no alcanza para escribir', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/health/members/member-1')
      .set('Authorization', `Bearer ${tokenFor(socioConSalud)}`)
      .send({ allergies: 'Polen' })
      .expect(403);
  });

  it('cada socio llega a su propia ficha con profile:own', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/me')
      .set('Authorization', `Bearer ${tokenFor(socio)}`)
      .expect(200);

    expect(memberFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'member-1' } }),
    );
  });

  it('un admin sin socio vinculado recibe un 400 explicativo, no un 404', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health/me')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .expect(400);

    expect(res.body.message).toMatch(/no está vinculado a un socio/i);
  });

  it('el directorio de contactos no expone ningún campo de salud', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/contacts')
      .set('Authorization', `Bearer ${tokenFor(socio)}`)
      .expect(200);

    const select = memberFindMany.mock.calls.at(-1)?.[0]?.select ?? {};

    expect(select.health).toBeUndefined();
    expect(select.bloodType).toBeUndefined();
    // Ni datos que son del padrón y no del directorio.
    expect(select.category).toBeUndefined();
    expect(select.notes).toBeUndefined();
    // Lo que sí tiene que viajar.
    expect(select.emergencyContactPhone).toBe(true);
  });

  it('rechaza un campo desconocido en el cuerpo (whitelist estricta)', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/health/me')
      .set('Authorization', `Bearer ${tokenFor(socio)}`)
      .send({ allergies: 'Polen', diagnosticoSecreto: 'x' })
      .expect(400);
  });
});
