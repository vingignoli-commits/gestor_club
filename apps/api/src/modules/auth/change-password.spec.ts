import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { createHmac } from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { signToken } from '../../common/auth/token';
import { PrismaService } from '../prisma/prisma.service';

process.env.AUTH_TOKEN_SECRET = 'test-secret';

const SALT = 'salt-fijo-de-test';
const CURRENT_PASSWORD = 'progreso';

function hash(password: string, salt = SALT) {
  return createHmac('sha256', salt).update(password).digest('hex');
}

const socio = {
  id: 'socio-1',
  email: 'socio@club.test',
  fullName: 'Socio',
  role: UserRole.SOCIO,
  memberId: 'member-1',
  isActive: true,
  passwordSalt: SALT,
  passwordHash: hash(CURRENT_PASSWORD),
  permissions: [{ key: 'profile:own', enabled: true }],
};

const token = signToken({
  id: socio.id,
  email: socio.email,
  fullName: socio.fullName,
  role: socio.role,
  memberId: socio.memberId,
});

describe('POST /auth/me/password', () => {
  let app: INestApplication;

  const prismaMock = {
    user: {
      findUnique: vi.fn().mockResolvedValue(socio),
      update: vi.fn().mockResolvedValue(socio),
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

  function post(body: Record<string, string>, withToken = true) {
    const req = request(app.getHttpServer()).post('/api/v1/auth/me/password');
    if (withToken) req.set('Authorization', `Bearer ${token}`);
    return req.send(body);
  }

  it('cambia la contraseña y guarda un hash nuevo con salt nuevo', async () => {
    await post({
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'clave-nueva-larga',
    }).expect(201);

    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);

    const { where, data } = prismaMock.user.update.mock.calls[0][0];

    expect(where).toEqual({ id: socio.id });
    // Nunca se guarda la contraseña en claro, y el salt se renueva.
    expect(data.passwordSalt).not.toBe(SALT);
    expect(data.passwordHash).not.toBe(socio.passwordHash);
    expect(JSON.stringify(data)).not.toContain('clave-nueva-larga');
    // El hash guardado corresponde a la contraseña nueva.
    expect(data.passwordHash).toBe(hash('clave-nueva-larga', data.passwordSalt));
  });

  it('rechaza sin token', async () => {
    await post(
      { currentPassword: CURRENT_PASSWORD, newPassword: 'clave-nueva-larga' },
      false,
    ).expect(401);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rechaza si la contraseña actual es incorrecta', async () => {
    const res = await post({
      currentPassword: 'no-es-la-mia',
      newPassword: 'clave-nueva-larga',
    }).expect(401);

    expect(res.body.message).toBe('La contraseña actual no es correcta.');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña nueva de menos de 8 caracteres', async () => {
    await post({
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'corta',
    }).expect(400);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('rechaza repetir la contraseña actual', async () => {
    const res = await post({
      currentPassword: CURRENT_PASSWORD,
      newPassword: CURRENT_PASSWORD,
    }).expect(400);

    expect(res.body.message).toBe(
      'La contraseña nueva debe ser distinta de la actual.',
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('ignora un userId inyectado en el body: solo cambia la propia', async () => {
    // forbidNonWhitelisted rechaza campos que no estén en el DTO.
    await post({
      currentPassword: CURRENT_PASSWORD,
      newPassword: 'clave-nueva-larga',
      userId: 'admin-1',
    }).expect(400);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
