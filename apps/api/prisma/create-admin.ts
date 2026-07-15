import { config } from 'dotenv';
import { join } from 'path';
import { createHmac, randomBytes } from 'crypto';
import { PrismaClient, UserRole } from '@prisma/client';

// Carga apps/api/.env sin importar desde qué cwd se ejecute el script.
config({ path: join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

// Mismo esquema que AuthService.hashPassword: HMAC-SHA256 con salt aleatorio.
function hashPassword(password: string) {
  const salt = randomBytes(24).toString('hex');
  const hash = createHmac('sha256', salt).update(password).digest('hex');
  return { salt, hash };
}

async function main() {
  const email = (process.argv[2] ?? process.env.SEED_ADMIN_EMAIL ?? '')
    .trim()
    .toLowerCase();
  const password = (process.argv[3] ?? process.env.SEED_ADMIN_PASSWORD ?? '').trim();
  const fullName = process.argv[4] ?? 'Administrador';

  if (!email || password.length < 8) {
    console.error(
      'Uso: tsx prisma/create-admin.ts <email> <contraseña (mín. 8)> [nombre]',
    );
    process.exit(1);
  }

  const { salt, hash } = hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      passwordHash: hash,
      passwordSalt: salt,
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email,
      fullName,
      role: UserRole.ADMIN,
      passwordHash: hash,
      passwordSalt: salt,
      isActive: true,
      mustChangePassword: false,
    },
  });

  console.log(`✔ Admin listo para ingresar: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
