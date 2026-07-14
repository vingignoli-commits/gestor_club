import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { DashboardService } from '../../modules/dashboard/dashboard.service';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { signToken } from './token';

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

function permissionRows(granted: string[]) {
  return granted.map((key) => ({ key, enabled: true }));
}

const admin: FakeUser = {
  id: 'admin-1',
  email: 'admin@club.test',
  fullName: 'Admin',
  role: UserRole.ADMIN,
  memberId: null,
  isActive: true,
  permissions: [],
};

// El caso del bug: socio sin 'dashboard:read'.
const socioSinDashboard: FakeUser = {
  id: 'socio-1',
  email: 'socio@club.test',
  fullName: 'Socio Sin Dashboard',
  role: UserRole.SOCIO,
  memberId: 'member-1',
  isActive: true,
  permissions: permissionRows(['profile:own']),
};

// Socio que ve el dashboard pero NO el padrón nominal de deudores.
const socioConDashboard: FakeUser = {
  id: 'socio-2',
  email: 'socio2@club.test',
  fullName: 'Socio Con Dashboard',
  role: UserRole.SOCIO,
  memberId: 'member-2',
  isActive: true,
  permissions: permissionRows(['dashboard:read', 'profile:own']),
};

const socioInactivo: FakeUser = {
  id: 'socio-3',
  email: 'baja@club.test',
  fullName: 'Socio Dado De Baja',
  role: UserRole.SOCIO,
  memberId: 'member-3',
  isActive: false,
  permissions: permissionRows(['dashboard:read']),
};

const USERS = [admin, socioSinDashboard, socioConDashboard, socioInactivo];

function tokenFor(user: FakeUser) {
  return signToken({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    memberId: user.memberId,
  });
}

const dashboardPayload = { people: {}, accounting: {} };

describe('AccessGuard (API cerrada por defecto)', () => {
  let app: INestApplication;
  const getExecutiveDashboard = vi.fn().mockResolvedValue(dashboardPayload);

  const prismaMock = {
    user: {
      findUnique: vi.fn(({ where }: { where: { id?: string; email?: string } }) => {
        const found = USERS.find(
          (user) => user.id === where.id || user.email === where.email,
        );
        return Promise.resolve(found ?? null);
      }),
      update: vi.fn().mockResolvedValue(admin),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $on: vi.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(DashboardService)
      .useValue({ getExecutiveDashboard })
      .compile();

    app = moduleRef.createNestApplication();
    // Espeja el bootstrap real (main.ts).
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

  describe('sin token', () => {
    it('rechaza el dashboard con 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dashboard/executive')
        .expect(401);

      expect(getExecutiveDashboard).not.toHaveBeenCalled();
    });

    // Endpoints que hoy en producción responden 200 sin token.
    it.each([
      '/api/v1/members',
      '/api/v1/reports/debtors',
      '/api/v1/cash/summary',
      '/api/v1/payments',
      '/api/v1/audit-logs',
      '/api/v1/whatsapp/templates',
      '/api/v1/auth/users',
      '/api/v1/auth/me',
    ])('rechaza GET %s con 401', async (path) => {
      await request(app.getHttpServer()).get(path).expect(401);
    });

    it('rechaza la creación de usuarios con 401 (escalada de privilegios)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/users')
        .send({
          email: 'atacante@evil.test',
          fullName: 'Atacante',
          role: 'ADMIN',
          password: 'password123',
        })
        .expect(401);
    });

    it('rechaza el reseteo de contraseña ajena con 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/users/admin-1/reset-password')
        .send({ password: 'password123' })
        .expect(401);
    });

    it('rechaza un token con firma inválida', async () => {
      const [payload] = tokenFor(admin).split('.');

      await request(app.getHttpServer())
        .get('/api/v1/dashboard/executive')
        .set('Authorization', `Bearer ${payload}.firma-falsa`)
        .expect(401);
    });

    it('deja pasar el login, que es público', async () => {
      // Llega al servicio (credenciales inválidas), no lo frena el guard.
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nadie@club.test', password: 'password123' })
        .expect(401);

      expect(res.body.message).toBe('Usuario o contraseña incorrectos');
    });
  });

  describe('con token', () => {
    it('rechaza con 403 al socio sin dashboard:read', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dashboard/executive')
        .set('Authorization', `Bearer ${tokenFor(socioSinDashboard)}`)
        .expect(403);

      expect(getExecutiveDashboard).not.toHaveBeenCalled();
    });

    it('rechaza con 401 al usuario desactivado, aunque su token siga vigente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/dashboard/executive')
        .set('Authorization', `Bearer ${tokenFor(socioInactivo)}`)
        .expect(401);
    });

    it('permite el dashboard al socio con dashboard:read, sin el padrón de deudores', async () => {
      getExecutiveDashboard.mockClear();

      await request(app.getHttpServer())
        .get('/api/v1/dashboard/executive')
        .set('Authorization', `Bearer ${tokenFor(socioConDashboard)}`)
        .expect(200);

      expect(getExecutiveDashboard).toHaveBeenCalledWith({
        includeDebtorDetails: false,
      });
    });

    it('permite al ADMIN el dashboard completo, con el padrón de deudores', async () => {
      getExecutiveDashboard.mockClear();

      await request(app.getHttpServer())
        .get('/api/v1/dashboard/executive')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .expect(200);

      expect(getExecutiveDashboard).toHaveBeenCalledWith({
        includeDebtorDetails: true,
      });
    });

    it('niega al socio la gestión de usuarios (403), pero permite /auth/me', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${tokenFor(socioConDashboard)}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokenFor(socioConDashboard)}`)
        .expect(200);
    });

    it('niega escribir el padrón al socio que solo puede leerlo', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/members')
        .set('Authorization', `Bearer ${tokenFor(socioConDashboard)}`)
        .send({})
        .expect(403);
    });
  });
});
