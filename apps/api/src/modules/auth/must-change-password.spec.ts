import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { createHmac } from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../prisma/prisma.service';

process.env.AUTH_TOKEN_SECRET = 'test-secret';

const SHARED = 'progreso';

function userWith(password: string, mustChangePassword: boolean) {
  const passwordSalt = 'salt-de-test';

  return {
    id: 'socio-1',
    email: 'socio@club.test',
    fullName: 'Socio',
    role: UserRole.SOCIO,
    memberId: 'member-1',
    isActive: true,
    mustChangePassword,
    passwordSalt,
    passwordHash: createHmac('sha256', passwordSalt).update(password).digest('hex'),
    permissions: [{ key: 'profile:own', enabled: true }],
  };
}

describe('mustChangePassword en el login', () => {
  let app: INestApplication;

  const prismaMock = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
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

  beforeEach(() => {
    prismaMock.user.update.mockClear();
  });

  function login(password: string) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'socio@club.test', password });
  }

  it('marca al usuario que entra con la clave compartida, aunque en la base figure en false', async () => {
    // Caso de los accesos creados antes de existir la columna: la migración
    // los dejó en false y solo el login puede detectarlos.
    prismaMock.user.findUnique.mockResolvedValue(userWith(SHARED, false));

    const res = await login(SHARED).expect(201);

    expect(res.body.user.mustChangePassword).toBe(true);
    // Y queda persistido, no solo en la respuesta.
    expect(prismaMock.user.update.mock.calls[0][0].data.mustChangePassword).toBe(
      true,
    );
  });

  it('no molesta a quien ya eligió su propia contraseña', async () => {
    prismaMock.user.findUnique.mockResolvedValue(
      userWith('mi-clave-personal', false),
    );

    const res = await login('mi-clave-personal').expect(201);

    expect(res.body.user.mustChangePassword).toBe(false);
    // No se reescribe el flag si no cambió.
    expect(
      prismaMock.user.update.mock.calls[0][0].data,
    ).not.toHaveProperty('mustChangePassword');
  });

  it('sigue exigiendo el cambio si un ADMIN le reseteó la clave', async () => {
    // mustChangePassword=true en la base, con una contraseña que no es la
    // compartida: la eligió un tercero igual.
    prismaMock.user.findUnique.mockResolvedValue(
      userWith('clave-puesta-por-admin', true),
    );

    const res = await login('clave-puesta-por-admin').expect(201);

    expect(res.body.user.mustChangePassword).toBe(true);
  });

  it('nunca devuelve el hash ni el salt al cliente', async () => {
    prismaMock.user.findUnique.mockResolvedValue(userWith(SHARED, false));

    const res = await login(SHARED).expect(201);

    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('passwordSalt');
  });
});
